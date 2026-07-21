# backend

A project created with FastAPI CLI.

## Quick Start

### Start the development server

```bash
uv run fastapi dev
```

Visit http://localhost:8000

## Environment

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update the values as needed.
3. Settings are validated when FastAPI starts — missing required values fail at startup.

`DATABASE_MIGRATION_URL` is optional. When set, Alembic uses it instead of `DATABASE_URL`; leave it blank to have Alembic fall back to `DATABASE_URL`. A second URL is not required for local development.

## Logging

- Every request receives an `X-Request-ID`.
- Clients may send an existing `X-Request-ID` header, and the same value is returned in the response.
- Request logs include method, path, status code, and duration.
- Request bodies, secrets, and query values are not logged.

## Operational Endpoints

- `GET /health` - liveness endpoint confirming the process is running; performs no dependency checks.
- `GET /ready` - application readiness endpoint validating configuration, application state, and database connectivity.

## Database

- Async PostgreSQL access uses SQLAlchemy 2 with the Psycopg 3 driver.
- One async engine and one `async_sessionmaker` are created at startup; the engine is never created per request.
- `app.database.session.get_db()` yields one `AsyncSession` per request, rolling back only if an unhandled exception escapes and always closing the session.
- The dependency never commits automatically — transaction ownership belongs to the service layer that uses the session.
- `Base` uses a deterministic constraint naming convention so indexes, unique constraints, checks, foreign keys, and primary keys get predictable names.
- No models exist yet; this is infrastructure only. The first domain model arrives with the Project Management vertical slice.
- `GET /ready` verifies database connectivity with a lightweight `SELECT 1` and returns `503` through the standard error envelope when the database is unreachable.

## Migrations

- Alembic is the only supported mechanism for changing the database schema; `Base.metadata.create_all()` is never used, in application code or otherwise.
- Migrations share the same `Base.metadata` and naming convention as the application, defined in `app/database/base.py`.
- Runtime requests use `DATABASE_URL`. Migrations use `DATABASE_MIGRATION_URL` when set, and fall back to `DATABASE_URL` otherwise.
- The baseline migration (`migrations/versions/`) is intentionally empty — it establishes migration history before any domain tables exist. No Project tables exist yet.
- Migrations are never run automatically during FastAPI startup; they are always a separate, explicit step.

Local commands (run from `backend/`):

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic current
uv run alembic history
```

Or from the repository root:

```bash
pnpm db:revision -m "describe change"
pnpm db:upgrade
pnpm db:downgrade
pnpm db:current
pnpm db:history
```

## Error Responses

- Errors use one standard envelope, regardless of the source.
- Error bodies include a stable, machine-readable `code`.
- Error bodies include the request ID that generated the error.
- Validation errors return normalized field details instead of raw framework output.
- Unexpected internal details are logged with a stack trace but are not returned publicly.

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Resource not found",
    "details": null,
    "requestId": "request-id-value"
  }
}
```

### Deploy to FastAPI Cloud

Sign up and log in at https://fastapicloud.com, then deploy with:

```bash
uv run fastapi deploy
```

## Project Structure

- `app/main.py` - Creates the FastAPI application and includes the top-level router
- `app/api/router.py` - Top-level API router that aggregates the route modules
- `app/api/routes/root.py` - Root route (`GET /`)
- `app/core/config.py` - Application settings loaded from the environment / `.env`
- `app/database/base.py` - Declarative `Base` and the deterministic constraint naming convention
- `app/database/engine.py` - Async engine and session factory
- `app/database/session.py` - `get_db()` FastAPI dependency yielding one session per request
- `alembic.ini` - Alembic configuration; the runtime database URL is supplied programmatically by `migrations/env.py`, never hardcoded here
- `migrations/env.py` - Async Alembic environment wired to `Base.metadata`
- `migrations/versions/` - Migration history, starting with the infrastructure-only baseline
- `pyproject.toml` - Project dependencies and the FastAPI entrypoint (`app.main:app`)

## Learn More

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [FastAPI Cloud](https://fastapicloud.com)
