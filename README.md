# Next.js FastAPI Foundation

A production-ready foundation for building full-stack applications with Next.js, FastAPI, PostgreSQL, SQLAlchemy, Alembic, and typed API communication.

The repository works as a complete starting point and includes a small Project Management reference feature to demonstrate the architecture from frontend to database. Developers can use the foundation as-is or extend it later with authentication, multi-tenancy, billing, storage, background jobs, and other product-specific capabilities.

The project is currently being built step by step. See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for the complete implementation roadmap.

See [docs/changelog.md](./docs/changelog.md) for unreleased changes and future release history.

## Getting Started

Before the first run, copy the frontend environment example and fill in the values:

```bash
cp frontend/.env.example frontend/.env.local
```

`frontend/.env.local` is the file Next.js loads for local development. Without it, the frontend fails immediately with a clear environment-validation error — see [Environment Configuration](#environment-configuration) below.

## Database Migrations

Alembic is the only supported way to change the database schema; `Base.metadata.create_all()` is never used. Run migration commands from the repository root:

```bash
pnpm db:revision -m "describe change"
pnpm db:upgrade
pnpm db:downgrade
pnpm db:current
pnpm db:history
```

`db:revision` always runs with `--autogenerate`; pass the message directly (no `--` separator — the underlying script is already a compound shell command, and pnpm forwards trailing arguments to it as-is).

## Local PostgreSQL 17

Start the Homebrew-managed server as your normal macOS user, then verify it before
running migrations or starting the application:

```bash
brew services start postgresql@17
brew services list
pg_isready -h localhost -p 5432
pnpm db:upgrade
pnpm db:current
```

PostgreSQL must never be started as root or through `sudo brew services`.
On Apple Silicon Homebrew, the default PostgreSQL 17 cluster is
`/opt/homebrew/var/postgresql@17`. Never run `initdb` over that directory when it
already contains `PG_VERSION` or user data.

If the service fails, inspect its status and log before changing anything:

```bash
launchctl print gui/$(id -u)/homebrew.mxcl.postgresql@17
tail -n 200 /opt/homebrew/var/log/postgresql@17.log
```

A stale `postmaster.pid` may be removed only after both `pg_ctl status` and the
host process/port state prove that no PostgreSQL server is using the cluster.
Stop the Homebrew service before removing a proven-stale lock, then restart it
normally. Do not delete or reinitialize the data directory as a recovery shortcut.

When PostgreSQL is temporarily unreachable, `/ready` and database-backed API
operations return `503 Service Unavailable` using the standard safe
`database_unavailable` error envelope and request ID. `/health` remains a
process-only liveness check.

## Repository Quality Commands

Run the canonical safe pre-commit workflow from the repository root:

```bash
pnpm check
```

It runs frontend ESLint, backend Ruff lint and formatting checks, frontend and
backend unit tests, OpenAPI and generated-client freshness checks, the Next.js
production build, and backend compile validation. It does not run PostgreSQL
integration tests, Playwright, database creation, Alembic migrations, or GitHub
Actions.

The individual repository commands are:

```bash
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm build
```

`pnpm format` applies Ruff formatting to backend Python while excluding Alembic
revision files. The corresponding `pnpm format:check` command is read-only.
PostgreSQL integration and Playwright remain explicit commands documented below.

## Backend Tests

```bash
pnpm test:backend
```

The default backend test suite excludes `backend/tests/integration/` and does not require a running PostgreSQL instance.

Run the real-PostgreSQL and Alembic integration suite explicitly:

```bash
pnpm test:backend:integration
```

This command requires a reachable, dedicated PostgreSQL database whose name contains `test` as a complete, case-insensitive underscore-delimited segment, such as `test`, `test_projects`, or `next_fastapi_test`. Names where those letters are only incidental, such as `latest` or `productiontest`, are rejected. Connection-target query parameters (`dbname`, `database`, `host`, `hostaddr`, `port`, `service`, and `servicefile`, matched case-insensitively) are also forbidden; harmless connection options such as `sslmode` remain supported. The command fails rather than skips when the database cannot be reached.

## End-to-End Tests

Install the Chromium version managed by Playwright once:

```bash
pnpm playwright:install
```

Then run the complete Project Management browser-to-PostgreSQL flow:

```bash
pnpm test:e2e
```

`PLAYWRIGHT_DATABASE_URL` may override the safe local default,
`postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_e2e_test`.
It must identify a dedicated PostgreSQL test database; the shared backend guard
rejects unsafe database names, malformed URLs, non-PostgreSQL drivers, and
target-changing query parameters before either development server starts. Never
point this variable at the normal development database. Both `postgresql://` and
`postgresql+psycopg://` forms are accepted; the plain form is normalized
internally to `postgresql+psycopg://` because Psycopg 3 is the installed driver.

The command creates the dedicated database only when PostgreSQL specifically
reports that it is missing, upgrades it to the Alembic head, deletes all Project
rows before and after the test, and starts fresh backend and frontend processes
that cannot reuse existing servers. The Step 25 suite runs Chromium with one
worker. Failure screenshots and local traces are retained under the ignored
Playwright artifact directories; video is disabled. GitHub Actions wiring remains
Step 27 and is not included here.

## Environment Configuration

Configuration belongs in environment variables. Application code never changes between local development, CI, preview, staging, or production — only the environment values do.

The frontend requires two server-only variables:

```bash
APP_ORIGIN=http://localhost:3000
FASTAPI_INTERNAL_URL=http://127.0.0.1:8000
```

- `APP_ORIGIN` is the canonical frontend origin, used for server-generated absolute URLs (metadata, canonical links, password reset and email links, OAuth callbacks). It is never used for browser fetches and is not a security boundary.
- `FASTAPI_INTERNAL_URL` is the backend origin used by Server Components and Server Actions for direct server-to-server requests. It must never be exposed through a `NEXT_PUBLIC_` variable.

Both are validated at startup in `frontend/lib/env/server.ts`; the application fails immediately with a clear message when either is missing or not a valid HTTP or HTTPS origin (no path, credentials, query, or fragment). See [frontend/README.md](./frontend/README.md) for details.

## Foundation Scope

Version one focuses on:

- Reliable Next.js-to-FastAPI communication
- PostgreSQL access through async SQLAlchemy
- Alembic migrations
- Environment validation
- Logging and request IDs
- Standard errors
- Health and readiness
- OpenAPI-generated frontend client
- Tests and CI
- One small Project Management reference feature

## Optional Extensions

These are intentionally excluded from the core so each project can choose the providers and architecture that fit its needs:

- Authentication
- Multi-tenancy
- Roles and permissions
- Billing
- Email
- File storage
- Realtime
- Background jobs
- Redis
- Audit logging
- Organizations and teams
