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

Clone the project

```bash
  git clone https://github.com/wangjus0/TritonSchedule.git
```

Go to the project directory

```bash
  cd TritonSchedule
```

Configure environment variables

```bash
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
```

Fill in your Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`, `DATABASE_URL`) plus a shared `API_KEY`/`VITE_API_KEY` and
`JWT_SECRET`. See `backend/.env.example` and `frontend/.env.example` for the full list.

Install dependencies and set up the workspace

```bash
  npm run setup
```

`npm run setup` installs dependencies and starts the local Supabase stack. Use
`npm run setup -- --local` to boot Supabase with the Supabase CLI, or
`npm run setup -- --check` to validate your environment without installing.
Run `npm run setdown` (alias `npm run teardown`) to stop the local Supabase stack.

Start the application

```bash
  npm run dev
```
