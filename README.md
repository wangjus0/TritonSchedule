<div align="center">
  <img src="./frontend/public/triton-schedule-logo-only.svg" alt="TritonSchedule Logo" width="280" />
  <h1>TritonSchedule</h1>
  <h3>Making UCSD scheduling easier</h3>
  <em></em>
 <img src="https://img.shields.io/github/actions/workflow/status/wangj000/TritonSchedule/ci-cd.yml?branch=main&label=build&style=flat-square" alt="Build" />
  <img src="https://img.shields.io/github/actions/workflow/status/wangj000/TritonSchedule/ci-cd.yml?branch=main&label=tests&style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT" />
</div>

## Features

- WIP

## Contributions

### Quick Start

Prerequisites:

- Node.js 22 and npm
- A MongoDB instance reachable through `MONGO_URI`
- Docker and the Supabase CLI only when using the optional local Supabase stack

Clone the project:

```bash
git clone https://github.com/wangj000/TritonSchedule.git
```

Go to the project directory:

```bash
cd TritonSchedule
```

Set up the workspace:

```bash
npm run setup
```

The setup command creates `backend/.env` and `frontend/.env` from their examples when needed, generates matching API keys and a JWT secret for local development, validates required settings, and installs root, backend, and frontend dependencies.
It starts Supabase only when `SUPABASE_URL` points to the local stack.

Start the frontend and backend in watch mode:

```bash
npm run dev
```

The frontend is served at `http://localhost:8080` and proxies `/api` requests to the backend at `http://localhost:3000`.

### Setup options

Pass setup options after `--`:

```bash
npm run setup -- --check
npm run setup -- --skip-install
npm run setup -- --skip-supabase
npm run setup -- --local
npm run setup -- --reset-db
```

- `--check` validates existing environment files without installing dependencies or starting services.
- `--skip-install` preserves existing dependency installations.
- `--skip-supabase` does not start local Supabase.
- `--local` starts local Supabase and synchronizes its connection values into `backend/.env`.
- `--reset-db` starts local Supabase and resets its database from migrations, deleting existing local database data.

Run only one application when needed:

```bash
npm run dev:frontend
npm run dev:backend
```

### Environment variables

The setup command reads [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).
Keep `API_KEY` and `VITE_API_KEY` identical because the frontend sends the value as a bearer token and the backend checks it on protected requests.
The frontend no longer has a built-in API key fallback, so production builds must provide `VITE_API_KEY` or the supported `API_KEY` alias.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Backend | MongoDB connection string. |
| `DB_NAME` | Backend | MongoDB database name. |
| `API_KEY` | Backend | Bearer token accepted by the API and optional frontend build-time alias. |
| `JWT_SECRET` | Backend | Secret required by backend health validation. |
| `PORT` | Optional | Backend listener port, defaulting to `3000`. |
| `NODE_ENV` | Optional | Runtime environment; local `.env` loading is disabled in production. |
| `SUPABASE_URL` | Optional | Hosted or local Supabase API URL used by workspace setup. |
| `SUPABASE_PUBLISHABLE_KEY` | Optional | Supabase publishable key synchronized for local development. |
| `SUPABASE_ANON_KEY` | Optional | Supabase anonymous key synchronized for local development. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service-role key synchronized for local development. |
| `DATABASE_URL` | Optional | Supabase PostgreSQL connection string synchronized for local development. |
| `DB_PASSWORD` | Optional | Supabase PostgreSQL password used by local tooling. |
| `VITE_API_BASE_URL` | Frontend | Primary backend URL; local development uses the Vite `/api` proxy. |
| `VITE_API_BASE_FALLBACK_URL` | Optional | Fallback backend URL for eligible failed responses. |
| `VITE_API_KEY` | Frontend | Bearer token embedded into the frontend build. |
| `VITE_DEV` | Optional | Development flag available to the frontend. |

The backend currently stores application data in MongoDB.
The Supabase variables and [`supabase/config.toml`](supabase/config.toml) support the optional local Supabase workspace.

### Stopping local Supabase

Stop this workspace's local Supabase stack while preserving its data backup:

```bash
npm run setdown
```

`npm run teardown` is an alias for the same command.
Pass `--wipe` to remove local Supabase data, `--dry-run` to print the command without running it, or `--all` to stop every local Supabase project on the machine:

```bash
npm run setdown -- --wipe
npm run setdown -- --dry-run
npm run setdown -- --all
```

The setdown command does not stop MongoDB.

See [`backend/README.md`](backend/README.md) for backend structure, verification, and deployment details.
