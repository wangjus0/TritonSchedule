# Course catalog deployment requirements

Course search depends on Supabase and does not contain a bundled production catalog.
The backend deployment must define `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for every environment that serves `/term` or `/course`.
The service role key is server-only and must never be exposed through a `VITE_` variable.

Before promoting the backend, apply the committed migrations in `supabase/migrations` to the target Supabase project.
Then invoke the authenticated `/refresh` operation to populate the catalog, or run the equivalent approved ingestion operation.
A successful deployment has exactly one active row in `terms` and at least one valid row in `courses` for that term.

Verify the deployment without printing credentials:

```text
GET /term                              -> 200 { "Term": "<current term>" }
GET /course?course=CSE%20100&term=     -> 200 { "data": [...] }
GET /course?course=NOT%20A%20COURSE    -> 200 { "data": [] }
```

`503 CATALOG_UNAVAILABLE` means the catalog dependency or its deployment configuration is unavailable.
A `200` response with an empty term or empty data is valid and means no active or matching catalog data is currently available.

## Current production blocker

The production failures reproduced on July 12, 2026 are consistent with the Supabase migration being deployed in code while the Vercel backend lacks usable Supabase configuration, the target schema, populated catalog data, or some combination of those operational prerequisites.
The public responses intentionally do not reveal which secret or database operation failed.
An operator with Vercel and Supabase access must verify the server-side variables, apply the migrations, populate the catalog, and repeat the checks above.
No credential values are recorded in this repository.
