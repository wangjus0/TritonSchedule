#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"
FRONTEND_ENV="$ROOT_DIR/frontend/.env"

CHECK_ONLY=0
INSTALL_DEPS=1
SUPABASE_MODE="auto"
RESET_DB=0

usage() {
  cat <<'USAGE'
Usage: npm run setup -- [options]

Sets up the Supabase migration worktree without using MongoDB env vars.

Options:
  --check           Validate env/scripts only; do not install or start services
  --skip-install    Do not install npm dependencies
  --skip-supabase   Do not start local Supabase, even for local SUPABASE_URL values
  --local           Start the local Supabase stack with the Supabase CLI
  --reset-db        Reset the local Supabase database after start (destructive to local data)
  -h, --help        Show this help
USAGE
}

log() {
  printf '[setup] %s\n' "$*"
}

warn() {
  printf '[setup] warning: %s\n' "$*" >&2
}

fail() {
  printf '[setup] error: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      INSTALL_DEPS=0
      SUPABASE_MODE="skip"
      ;;
    --skip-install)
      INSTALL_DEPS=0
      ;;
    --skip-supabase)
      SUPABASE_MODE="skip"
      ;;
    --local)
      SUPABASE_MODE="local"
      ;;
    --reset-db)
      SUPABASE_MODE="local"
      RESET_DB=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
  shift
done

env_value() {
  local key="$1"
  local file="$2"

  awk -F= -v key="$key" '
    $0 ~ /^[[:space:]]*#/ { next }
    $1 ~ "^[[:space:]]*" key "[[:space:]]*$" {
      value = $0
      sub(/^[^=]*=/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      gsub(/^'"'"'|'"'"'$/, "", value)
      print value
      exit
    }
  ' "$file"
}

has_env_key() {
  local key="$1"
  local file="$2"

  grep -Eq "^[[:space:]]*${key}[[:space:]]*=" "$file"
}

is_placeholder() {
  local value="$1"

  [[ -z "$value" ]] ||
    [[ "$value" == your_* ]] ||
    [[ "$value" == your-* ]] ||
    [[ "$value" == *your-project-ref* ]] ||
    [[ "$value" == *your_password* ]] ||
    [[ "$value" == *your_*_here ]] ||
    [[ "$value" == *example.supabase.co* ]]
}

ensure_backend_env() {
  if [[ -f "$BACKEND_ENV" ]]; then
    return
  fi

  if (( CHECK_ONLY )); then
    fail "Missing backend/.env. Run setup without --check to create it from backend/.env.example."
  fi

  [[ -f "$ROOT_DIR/backend/.env.example" ]] || fail "Missing backend/.env.example."
  cp "$ROOT_DIR/backend/.env.example" "$BACKEND_ENV"
  warn "Created backend/.env from backend/.env.example. Fill required values before running the app."
}

validate_env_file() {
  local prohibited=(MONGO_URI DB_NAME)
  local found_prohibited=()
  for key in "${prohibited[@]}"; do
    if has_env_key "$key" "$BACKEND_ENV"; then
      found_prohibited+=("$key")
    fi
  done

  if (( ${#found_prohibited[@]} > 0 )); then
    fail "Remove MongoDB env vars from backend/.env: ${found_prohibited[*]}. This worktree uses Supabase."
  fi

  local required=(SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY API_KEY JWT_SECRET)
  local missing_required=()
  for key in "${required[@]}"; do
    local value
    value="$(env_value "$key" "$BACKEND_ENV")"
    if is_placeholder "$value"; then
      missing_required+=("$key")
    fi
  done

  if (( ${#missing_required[@]} > 0 )); then
    fail "Missing or placeholder required env values in backend/.env: ${missing_required[*]}"
  fi

  local recommended=(SUPABASE_PUBLISHABLE_KEY SUPABASE_ANON_KEY DATABASE_URL DB_PASSWORD)
  local missing_recommended=()
  for key in "${recommended[@]}"; do
    if ! has_env_key "$key" "$BACKEND_ENV" || is_placeholder "$(env_value "$key" "$BACKEND_ENV")"; then
      missing_recommended+=("$key")
    fi
  done

  if (( ${#missing_recommended[@]} > 0 )); then
    warn "Missing or placeholder recommended/app env values in backend/.env: ${missing_recommended[*]}"
  fi

  log "Validated backend/.env uses required Supabase/app env vars and no MongoDB env vars."
}

ensure_frontend_env() {
  if [[ -f "$FRONTEND_ENV" ]]; then
    local frontend_api_key
    frontend_api_key="$(env_value VITE_API_KEY "$FRONTEND_ENV")"
    if ! is_placeholder "$frontend_api_key"; then
      return
    fi
    if (( CHECK_ONLY )); then
      warn "frontend/.env has missing or placeholder VITE_API_KEY; run setup without --check to sync it from backend API_KEY."
      return
    fi
  elif (( CHECK_ONLY )); then
    warn "frontend/.env is missing; run setup without --check to create it from frontend/.env.example."
    return
  else
    [[ -f "$ROOT_DIR/frontend/.env.example" ]] || return
    cp "$ROOT_DIR/frontend/.env.example" "$FRONTEND_ENV"
    warn "Created frontend/.env from frontend/.env.example."
  fi

  local backend_api_key
  backend_api_key="$(env_value API_KEY "$BACKEND_ENV")"
  awk -v key="$backend_api_key" '
    BEGIN { updated = 0 }
    /^[[:space:]]*VITE_API_KEY[[:space:]]*=/ {
      print "VITE_API_KEY=" key
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print "VITE_API_KEY=" key
      }
    }
  ' "$FRONTEND_ENV" > "$FRONTEND_ENV.tmp"
  mv "$FRONTEND_ENV.tmp" "$FRONTEND_ENV"
  log "Synced frontend VITE_API_KEY from backend API_KEY."
}

install_deps_for() {
  local dir="$1"
  local label="$2"

  if [[ ! -f "$dir/package.json" ]]; then
    return
  fi

  log "Installing $label dependencies"
  if [[ -f "$dir/package-lock.json" ]]; then
    npm --prefix "$dir" ci
  else
    npm --prefix "$dir" install
  fi
}

is_local_supabase_url() {
  local value="$1"

  [[ "$value" == http://127.0.0.1:54321* ]] || [[ "$value" == http://localhost:54321* ]]
}

is_hosted_supabase_url() {
  local value="$1"

  [[ "$value" == https://*.supabase.co* ]]
}

require_command() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || fail "Missing required command: $name"
}

start_local_supabase() {
  require_command supabase
  require_command docker

  docker info >/dev/null 2>&1 || fail "Docker is not running. Start Docker before starting local Supabase."

  log "Starting local Supabase"
  (cd "$ROOT_DIR" && supabase start)

  if (( RESET_DB )); then
    warn "Resetting local Supabase database from migrations. Local data will be replaced."
    (cd "$ROOT_DIR" && supabase db reset --local)
  fi
}

ensure_backend_env
validate_env_file
ensure_frontend_env

if (( INSTALL_DEPS )); then
  install_deps_for "$ROOT_DIR" "root"
  install_deps_for "$ROOT_DIR/backend" "backend"
  install_deps_for "$ROOT_DIR/frontend" "frontend"
fi

supabase_url="$(env_value SUPABASE_URL "$BACKEND_ENV")"
case "$SUPABASE_MODE" in
  skip)
    log "Skipping local Supabase startup."
    ;;
  local)
    if is_hosted_supabase_url "$supabase_url"; then
      warn "backend/.env points at hosted Supabase; starting local Supabase anyway because --local/--reset-db was requested."
    fi
    start_local_supabase
    ;;
  auto)
    if is_local_supabase_url "$supabase_url"; then
      start_local_supabase
    else
      log "Hosted/non-local SUPABASE_URL detected; skipping local Supabase startup. Use --local to start the local stack."
    fi
    ;;
  *)
    fail "Invalid Supabase mode: $SUPABASE_MODE"
    ;;
esac

log "Setup complete."
