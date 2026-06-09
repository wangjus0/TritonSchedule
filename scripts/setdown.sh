#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIPE=0
ALL_PROJECTS=0
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage: npm run setdown -- [options]

Stops the local Supabase stack for this workspace. MongoDB is not used.

Options:
  --wipe       Also delete local Supabase data volumes after stopping
  --all        Stop all local Supabase projects on this machine
  --dry-run    Print the command that would run, but do not stop anything
  -h, --help   Show this help
USAGE
}

log() {
  printf '[setdown] %s\n' "$*"
}

fail() {
  printf '[setdown] error: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wipe)
      WIPE=1
      ;;
    --all)
      ALL_PROJECTS=1
      ;;
    --dry-run)
      DRY_RUN=1
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

project_id() {
  local config="$ROOT_DIR/supabase/config.toml"
  [[ -f "$config" ]] || return 0

  awk -F= '
    $1 ~ /^[[:space:]]*project_id[[:space:]]*$/ {
      value = $2
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' "$config"
}

command -v supabase >/dev/null 2>&1 || fail "Missing required command: supabase"

cmd=(supabase stop)
if (( ALL_PROJECTS )); then
  cmd+=(--all)
else
  PROJECT_ID="$(project_id)"
  if [[ -z "$PROJECT_ID" ]]; then
    log "No supabase/config.toml found; no project-specific local Supabase stack to stop."
    exit 0
  fi
  cmd+=(--project-id "$PROJECT_ID")
fi

if (( WIPE )); then
  cmd+=(--no-backup)
fi

if (( DRY_RUN )); then
  printf '[setdown] would run:'
  printf ' %q' "${cmd[@]}"
  printf '\n'
  exit 0
fi

if (( WIPE )); then
  log "Stopping local Supabase and deleting local data volumes."
else
  log "Stopping local Supabase and preserving local data backup."
fi

(cd "$ROOT_DIR" && "${cmd[@]}")
log "Setdown complete."
