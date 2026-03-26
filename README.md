# TritonSchedule

TritonSchedule is a full-stack web application for [describe purpose]. It consists of a React frontend and a Node.js/Express backend.

## Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Testing**: Vitest (Frontend), Jest (Backend)
- **Linting**: ESLint
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 22+
- MongoDB (local or Atlas)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/wangjus0/tritonschedule.git
   cd tritonschedule
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm ci
   cd ..
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm ci
   cd ..
   ```

4. Set up environment variables:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your values:
   # MONGO_URI=your_mongodb_connection_string
   # DB_NAME=your_database_name
   # API_KEY=your_api_key

   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your values:
   # VITE_API_BASE_URL=http://localhost:3001
   # VITE_API_BASE_FALLBACK_URL=
   # VITE_API_KEY=your_frontend_api_key
   ```

5. Build and run the backend:
   ```bash
   cd backend
   npm run build
   npm start
   # Backend runs on http://localhost:3001 by default
   ```

6. In a new terminal, run the frontend:
   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

## Development Commands

### Backend (in `backend/` directory)

- `npm run build` - Compile TypeScript to JavaScript (output in `dist/`)
- `npm start` - Start the production server (runs from `dist/`)
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm test` - Run Jest tests with coverage
- `npm run test:watch` - Run Jest in watch mode
- `npm run typecheck` - Run TypeScript compiler without emitting files

### Frontend (in `frontend/` directory)

- `npm run dev` - Start Vite development server with HMR
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest with coverage
- `npm run test:watch` - Run Vitest in watch mode
- `npm run preview` - Preview production build locally

## Environment Variables

### Backend (`.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes |
| `API_KEY` | API key for authentication | Yes |

### Frontend (`.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Primary API endpoint URL (e.g., http://localhost:3001) | Yes |
| `VITE_API_BASE_FALLBACK_URL` | Fallback API endpoint URL (optional) | No |
| `VITE_API_KEY` | Frontend API key for authenticated requests | Yes |

## CI/CD

This repository uses GitHub Actions for continuous integration. The pipeline:

1. ✅ **Secret Scanning**: Detects potential secrets using gitleaks
2. ✅ **Linting**: ESLint on both frontend and backend
3. ✅ **Type Checking**: TypeScript compiler with `--noEmit`
4. ✅ **Testing**: Jest/Vitest with ≥80% line coverage enforcement
5. ✅ **Coverage Reports**: Uploaded to Codecov
6. ✅ **Config Validation**: Validates TypeScript, Vite, and Tailwind configs
7. ✅ **Env Doc Validation**: Ensures all `.env.example` variables are documented in this README

### CI Status Badge

[![CI/CD](https://github.com/wangjus0/tritonschedule/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/wangjus0/tritonschedule/actions/workflows/ci-cd.yml)

## Project Structure

```
tritonschedule/
├── .github/
│   └── workflows/
│       └── ci-cd.yml        # GitHub Actions CI/CD pipeline
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── ingestion/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── __tests__/
│   │   └── example.test.ts
│   ├── .env.example
│   ├── eslint.config.js
│   ├── jest.config.js
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── test/
│   │       └── example.test.ts
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── vercel.json
│   └── vitest.config.ts
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure CI passes (lint, type check, tests)
5. Submit a Pull Request

## License

ISC
