# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Frontend and backend are separate npm projects under `frontend/` and `backend/`; run each package's test, lint, and build scripts independently.
- Course catalog production prerequisites and safe verification checks are documented in `docs/course-catalog-deployment.md`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
