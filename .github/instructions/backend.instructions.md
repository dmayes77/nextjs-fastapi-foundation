---
applyTo: "backend/**/*.py"
---

# Backend Instructions

- Use the FastAPI application factory rather than introducing additional application singletons.
- Keep runtime configuration validation strict.
- Do not make required production settings optional merely to support tests or tooling.
- Tooling that does not require infrastructure may isolate itself with safe, process-local placeholders.
- Use Pydantic settings and typed schemas.
- Keep route handlers thin and move reusable behavior into focused modules.
- Add explicit, stable `operation_id` values to every public API route.
- Keep one intended HTTP method per FastAPI `APIRoute`.
- Separate GET and POST handlers may share the same URL path.
- Preserve globally unique OpenAPI operation IDs.
- Regenerate `backend/openapi.json` after intentional route or schema changes.
- Never hand-edit the committed OpenAPI contract.
- Database code must not execute real connections during import merely for schema inspection or tooling.
- Tests must not require a running PostgreSQL server unless the active roadmap step explicitly requires integration infrastructure.
- Use temporary paths and `monkeypatch` for tests that modify files or environment variables.
- Do not weaken runtime validation to make tests pass.
- Run:
  - `uv run python -m compileall app scripts tests`
  - `uv run pytest`
  - `pnpm openapi:check` when the API contract may have changed
