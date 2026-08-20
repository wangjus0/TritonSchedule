# TritonSchedule backend

This package serves the TritonSchedule API and runs the Class Planner catalog and Rate My Professors ingestion jobs.

## Directory layout

```text
backend/
├── src/                    # Production TypeScript
│   ├── controllers/        # HTTP request handlers
│   ├── ingestion/          # Class Planner and professor ingestion jobs
│   ├── middleware/         # Express middleware
│   ├── models/             # Shared domain types
│   ├── routes/             # Express route definitions
│   ├── services/           # Database integration
│   ├── utils/              # Small reusable helpers
│   ├── app.ts              # Express app configuration and Vercel entry point
│   └── server.ts           # Local and standalone server entry point
├── tests/                  # Automated tests and test setup
├── dist/                   # Generated production JavaScript
├── .env.example            # Local environment template
├── jest.config.cjs         # Test runner configuration
├── tsconfig.json           # Editor and full-project type checking
├── tsconfig.build.json     # Production-only compiler configuration
└── vercel.json             # Vercel build configuration
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
Use the repository-level `npm run setup` first to create environment files, align the frontend and backend API keys, and install all workspace dependencies.
The root [`README.md`](../README.md#environment-variables) documents every environment variable and the optional local Supabase setup.

## Course search and TSS metadata

`GET /course?course=<query>&term=<term>` responds with `{ data: Course[] }` and returns one course record for each matching primary section.
Primary sections include lecture, independent study, and seminar instruction types, including the Class Planner codes `LE`, `IN`, and `SE`.
Lecture, discussion, and lab entries retain the display fields `Days`, `Time`, and `Location` and may include the following Class Planner identifiers:

| Field | Meaning |
| --- | --- |
| `SectionId` | Class Planner section identifier. |
| `SectionRef` | Term-qualified Class Planner section reference. |
| `SectionCode` | Display code for the section. |
| `EventPackageIds` | TSS event packages that contain the section. |

Course records may also include `TssPackageUrls`, which maps event package IDs to their official TSS booking URLs for that primary section.
When Class Planner provides a module route instead of event-package deep links, the record exposes it as `TssFallbackUrl`.
These fields are optional because not every course or section combination has a valid TSS destination.
The frontend enables **Open in TSS** only after it resolves one package shared by the selected lecture, discussion, and lab, or a valid module fallback, and validates the exact HTTPS `tss.ucsd.edu/fiori` route before opening a new tab.

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
Use `npm run test:watch` for interactive test development and `npm run clean` to remove generated build output.

## Deployment

Vercel uses `src/app.ts` directly as its Express entry point.
The app is exported separately from `src/server.ts` so serverless deployment does not create a long-lived listener, while local and standalone deployments can still use `npm start`.

The GitHub Actions workflow in `.github/workflows/nightly-ingestion.yml` runs catalog ingestion outside the Vercel request lifecycle.
Run it manually from GitHub Actions or locally with `npm run ingest -- --professors=auto`.
