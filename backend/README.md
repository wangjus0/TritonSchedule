# TritonSchedule backend

This package serves the TritonSchedule API and runs the course and Rate My Professors ingestion jobs.

## Directory layout

```text
backend/
├── src/                    # Production TypeScript
│   ├── controllers/        # HTTP request handlers
│   ├── ingestion/          # Course and professor data ingestion
│   ├── middleware/         # Express middleware
│   ├── models/             # Shared domain types
│   ├── routes/             # Express route definitions
│   ├── services/           # Database integration
│   ├── utils/              # Small reusable helpers
│   ├── app.ts              # Express app configuration and Vercel entry point
│   └── server.ts           # Local and standalone server entry point
├── tests/                  # Automated tests and test setup
├── dist/                   # Generated production JavaScript
├── jest.config.cjs         # Test runner configuration
├── tsconfig.json           # Editor and full-project type checking
└── tsconfig.build.json     # Production-only compiler configuration
```

`dist/` is generated and must not be committed.
Its structure mirrors `src/` directly, so the server entry point is `dist/server.js` rather than `dist/src/server.js`.
Tests stay outside `src/` and are never emitted into the production build.

## Development

Install dependencies from this directory with `npm ci`.

Run the backend with automatic restart:

```bash
npm run dev
```

The repository-level `npm run dev` starts both the frontend and this backend in watch mode.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The first three commands validate source and test code.
The build command clears stale output and compiles production code only.
The start command runs the compiled server from `dist/server.js`.

## Deployment

Vercel uses `src/app.ts` directly as its Express entry point.
The app is exported separately from `src/server.ts` so serverless deployment does not create a long-lived listener, while local and standalone deployments can still use `npm start`.
