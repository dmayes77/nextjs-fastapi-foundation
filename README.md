# Next.js FastAPI Foundation

A production-oriented full-stack foundation for applications that use
[Next.js App Router](https://nextjs.org/), [FastAPI](https://fastapi.tiangolo.com/),
and PostgreSQL. It provides the connection, database, API-contract, testing, and
quality infrastructure that most products need before product-specific work
begins.

The repository includes a small Project Management vertical slice to demonstrate
the architecture from a responsive UI through FastAPI and SQLAlchemy to
PostgreSQL. It is a reference implementation, not a complete project-management
product.

The project is pre-1.0 (`0.1.0`) and remains private package metadata. The
application foundation and CI are implemented; GitHub template packaging and the
first stable release are not yet complete. See [Roadmap and status](#roadmap-and-status).

## Features

- Next.js App Router frontend with TypeScript, Tailwind CSS, and server-first
  rendering
- FastAPI backend with versioned application routes and deterministic OpenAPI
- PostgreSQL persistence through SQLAlchemy 2's async API and Psycopg 3
- Alembic-only schema migrations with deterministic constraint names
- Lightweight `GET /health` and database-aware `GET /ready` endpoints
- Request-scoped `X-Request-ID` propagation, structured request logging, and a
  consistent error envelope
- Separate same-origin browser and direct server-to-server API clients
- Generated TypeScript schema and operation helpers from committed OpenAPI
- Project model, repository, service, lifecycle API, and responsive frontend
- PostgreSQL/Alembic integration tests with fail-closed database safeguards
- Playwright browser-to-PostgreSQL lifecycle coverage
- Root lint, formatting, test, build, contract, and safe pre-commit commands
- Full-stack GitHub Actions validation with PostgreSQL and Chromium

Intentionally excluded from the foundation:

- Authentication, authorization, roles, and multi-tenancy
- Organizations, teams, tasks, comments, attachments, notifications, and time
  tracking
- Billing, email, file storage, realtime, background jobs, Redis, and audit
  logging
- Docker, infrastructure-as-code, and provider-specific deployment configuration
- Generic abstraction layers without a demonstrated consumer

These are extension points, not hidden prerequisites.

## Architecture

```mermaid
flowchart LR
    Browser["Browser"]
    Next["Next.js App Router"]
    API["FastAPI"]
    Service["Service layer"]
    Repo["Repository layer"]
    SQLA["SQLAlchemy 2 async"]
    PG["PostgreSQL"]

    Browser -->|"same-origin /api/v1/*"| Next
    Next -->|"rewrite or FASTAPI_INTERNAL_URL"| API
    API --> Service --> Repo --> SQLA --> PG
```

Browser code calls relative `/api/v1/...` paths. Next.js rewrites those requests
to FastAPI, so normal browser traffic stays same-origin. Server Components and
Server Actions call FastAPI directly through the server-only
`FASTAPI_INTERNAL_URL`.

Backend requests follow a deliberate direction:

```text
route → service → repository → AsyncSession → PostgreSQL
```

Routes own HTTP details, services own business rules and transaction boundaries,
repositories own persistence and row-lock mechanics, and SQLAlchemy table models
own database mapping. Next.js never connects directly to PostgreSQL.

The health demonstration uses a separate Next.js Route Handler:

```text
browser → /api/backend/health → Next.js Route Handler → GET /health → FastAPI
```

See [docs/architecture.md](docs/architecture.md) for the detailed request,
transaction, error, and generated-contract flows.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS, Radix-based shadcn/ui components |
| Backend | FastAPI, Pydantic Settings, SQLAlchemy 2 async API, Psycopg 3 |
| Database | PostgreSQL, Alembic |
| API contract | FastAPI OpenAPI, `openapi-typescript`, deterministic operation generator |
| Backend testing | Pytest, pytest-asyncio, real-PostgreSQL integration tests |
| Frontend testing | Jest, React Testing Library |
| End-to-end testing | Playwright with managed Chromium |
| Developer tooling | pnpm, uv, Ruff, ESLint |
| CI | GitHub Actions with PostgreSQL 17 |

The repository intentionally establishes Node.js 24, pnpm 11.10.0, Python 3.13,
uv 0.11.29, and PostgreSQL 17 in CI or package metadata. Application dependency
versions remain governed by the committed lockfiles.

## Repository structure

```text
.
├── frontend/                       # Next.js application and frontend dependencies
│   ├── app/                        # App Router pages, layouts, and Route Handlers
│   ├── components/                 # Application and reusable UI components
│   ├── lib/api/                    # Transport, contracts, and generated API files
│   ├── lib/errors/                 # Frontend error normalization
│   └── tests/                      # Jest and React Testing Library tests
├── backend/                        # FastAPI application and Python dependencies
│   ├── app/
│   │   ├── api/                    # Dependencies, errors, routers, and routes
│   │   ├── database/               # Async engine, sessions, metadata, and tables
│   │   ├── repositories/           # Persistence operations
│   │   ├── schemas/                # Public Pydantic contracts
│   │   └── services/               # Business rules and transactions
│   ├── migrations/                 # Alembic environment and revision history
│   ├── scripts/                    # OpenAPI and protected test-database tooling
│   ├── tests/                      # Default and PostgreSQL integration tests
│   └── openapi.json                # Committed deterministic API contract
├── e2e/                            # Playwright configuration, lifecycle, and tests
├── docs/                           # Architecture and engineering standards
├── .github/workflows/ci.yml        # Full-stack pull-request validation
├── package.json                    # Root development and validation commands
├── INSTRUCTIONS.md                 # Numbered implementation roadmap
└── README.md                       # Setup and operating guide
```

Frontend and backend dependencies are intentionally separate. This is a simple
duplex repository, not a workspace orchestrator or Turborepo.

## Prerequisites

Install these local tools:

- Git
- Node.js 24
- pnpm 11.10.0
- Python 3.13
- uv 0.11.29
- PostgreSQL 17, including client commands such as `psql`, `createdb`, and
  `pg_isready`

Playwright's Chromium build is installed separately when E2E testing is needed.
GitHub Actions installs Node.js, Python, pnpm, uv, PostgreSQL, Chromium, and the
Linux browser dependencies for CI; local development still requires the tools
listed above.

Verify the important local commands:

```bash
git --version
node --version
pnpm --version
python3 --version
uv --version
psql --version
```

## Initial setup

### Clone the repository

```bash
git clone https://github.com/dmayes77/nextjs-fastapi-foundation.git
cd nextjs-fastapi-foundation
```

This repository is not yet enabled as a GitHub template. Until that packaging
step is complete, clone or fork it instead of relying on GitHub's **Use this
template** button.

### Install dependencies

Install the root tools, frontend application, and locked backend environment:

```bash
pnpm install --frozen-lockfile
pnpm --dir frontend install --frozen-lockfile
cd backend && uv sync --locked --group dev && cd ..
```

### Create local environment files

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

The committed examples already contain safe local defaults. Review credentials
and database names for your PostgreSQL installation before continuing. Real
environment files are ignored by Git and must never be committed.

### Prepare PostgreSQL

Ensure PostgreSQL is running:

```bash
pg_isready -h localhost -p 5432
```

The committed backend example expects a PostgreSQL role named `postgres`, its
local password, and a database named `next_fastapi`. Create that database with an
administrative role if it does not exist:

```bash
createdb --host localhost --port 5432 --username postgres next_fastapi
```

Create the dedicated integration database separately:

```bash
createdb --host localhost --port 5432 --username postgres next_fastapi_test
```

The E2E helper uses `next_fastapi_e2e_test`. It creates that database only when
PostgreSQL specifically reports it missing and the configured role has database
creation permission. You may pre-create it instead:

```bash
createdb --host localhost --port 5432 --username postgres next_fastapi_e2e_test
```

These commands do not create roles or assign passwords. Use your PostgreSQL
administration workflow if your local role differs, then update
`backend/.env`, `TEST_DATABASE_URL`, and `PLAYWRIGHT_DATABASE_URL` accordingly.

### Apply migrations

```bash
pnpm db:upgrade
pnpm db:current
```

Alembic is the only supported schema-management path. The application does not
call `Base.metadata.create_all()`.

## Environment configuration

The two applications load environment files independently:

- Next.js: `frontend/.env.local`
- FastAPI and Alembic: `backend/.env` when commands run from `backend/`
- Integration and E2E overrides: shell or CI environment variables

### Frontend variables

| Variable | Required | Purpose | Safe local example |
| --- | --- | --- | --- |
| `APP_ORIGIN` | Yes | Canonical frontend origin for server-generated absolute URLs | `http://localhost:3000` |
| `FASTAPI_INTERNAL_URL` | Yes | FastAPI origin used only by Next.js server code and rewrites | `http://127.0.0.1:8000` |

Both values must be HTTP or HTTPS origins with no credentials, path, query, or
fragment. They are server-only and must not be renamed with a `NEXT_PUBLIC_`
prefix. No browser-exposed environment variable is currently required.

### Backend variables

| Variable | Required | Purpose | Safe local example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Async SQLAlchemy runtime connection | `postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi` |
| `DATABASE_MIGRATION_URL` | No | Separate Alembic target; blank falls back to `DATABASE_URL` | blank or the same local URL |
| `APP_ENV` | No | Application environment label; defaults to `development` | `development` |
| `DATABASE_ECHO` | No | Enables SQLAlchemy SQL logging; defaults to `false` | `false` |

### Test variables

| Variable | Required | Purpose | Safe local example |
| --- | --- | --- | --- |
| `TEST_DATABASE_URL` | No | Real-PostgreSQL pytest integration target | `postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_test` |
| `PLAYWRIGHT_DATABASE_URL` | No | Dedicated browser-test database target | `postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_e2e_test` |

Both commands provide the examples above as local defaults. Do not point either
variable at development, staging, or production data.

The shared safety guard accepts only `postgresql://` or
`postgresql+psycopg://` URLs with an explicit username, host, and database. The
database name must contain `test` as a complete, case-insensitive,
underscore-delimited segment. Accepted examples include `test`,
`test_projects`, and `next_fastapi_test`; `latest`, `contest`, and
`productiontest` are rejected.

Database-target query parameters are forbidden, even when their value is another
test-named database. The blocked names are `database`, `dbname`, `host`,
`hostaddr`, `port`, `service`, and `servicefile`, matched case-insensitively.
Harmless driver options such as `sslmode` remain supported. Validation failures
do not echo credentials.

## Running the application

Start both applications from the repository root:

```bash
pnpm dev
```

Or run them independently in separate terminals.

Terminal 1 — frontend:

```bash
pnpm dev:frontend
```

Terminal 2 — backend:

```bash
pnpm dev:backend
```

| Service | Local URL |
| --- | --- |
| Next.js | <http://localhost:3000> |
| Project workspace | <http://localhost:3000/projects> |
| FastAPI | <http://127.0.0.1:8000> |
| Swagger UI | <http://127.0.0.1:8000/docs> |
| OpenAPI JSON | <http://127.0.0.1:8000/openapi.json> |
| Health | <http://127.0.0.1:8000/health> |
| Readiness | <http://127.0.0.1:8000/ready> |

`/health` is process-only and does not query PostgreSQL. `/ready` performs a
lightweight `SELECT 1`; an unavailable database returns a normalized
`503 database_unavailable` response with an `X-Request-ID`.

Use one backend hostname consistently in the browser. Swagger uses same-origin
requests, so opening `/docs` on `127.0.0.1` generates requests to
`127.0.0.1`.

## Database workflow

PostgreSQL is the default and only configured application database. Runtime
requests use one async SQLAlchemy engine and one request-scoped `AsyncSession`.
Services own successful mutation boundaries and commits. The request-scoped
database dependency rolls back escaped exceptions and always closes the session.
Repositories do not define lifecycle policy.

Run migration commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm db:upgrade` | Upgrade the configured migration database to Alembic head |
| `pnpm db:downgrade` | Downgrade one revision |
| `pnpm db:current` | Show the database's current revision |
| `pnpm db:history` | Show migration history |
| `pnpm db:revision -m "describe change"` | Autogenerate a new revision |

Pass the migration message directly. Do not add a `--` separator:

```bash
pnpm db:revision -m "add customer table"
```

Review every autogenerated migration before applying it. Keep the model and
migration in the same change, register new table modules in
`backend/app/database/tables/__init__.py`, and never use Alembic downgrade
against production without a reviewed recovery plan.

`DATABASE_MIGRATION_URL` lets migrations use a different connection or role from
the runtime engine. When blank or unset, Alembic falls back to `DATABASE_URL`.
Make sure both values intentionally identify the expected database before
running schema commands.

Integration tests are destructive by design: their session fixture downgrades
and rebuilds the dedicated test database, resets it between tests, and
downgrades it to base at session teardown. The database-name and URL guards run
before Alembic can execute.

## API contract and generated client

FastAPI owns the public contract. A deterministic export is committed at
`backend/openapi.json`; the frontend generator reads that file without requiring
a running backend.

The generated files are:

- `frontend/lib/api/generated/schema.ts` — OpenAPI-derived TypeScript types
- `frontend/lib/api/generated/operations.ts` — typed operation helpers

The handwritten transport remains in `frontend/lib/api/client.ts`,
`frontend/lib/api/server.ts`, and `frontend/lib/api/shared.ts`. Generated
operations accept one of those transports rather than replacing it.

After changing a FastAPI route or Pydantic schema:

```bash
pnpm openapi:export
pnpm api:generate
pnpm api:check
```

Freshness checks are read-only:

- `pnpm openapi:check` compares a fresh deterministic export with
  `backend/openapi.json`.
- `pnpm api:check` runs the OpenAPI check and compares temporary regenerated
  frontend files byte-for-byte with the committed client.

Never edit `backend/openapi.json` or files under
`frontend/lib/api/generated/` manually.

## Quality commands

Run commands from the repository root.

| Command | Coverage |
| --- | --- |
| `pnpm lint` | Frontend ESLint and backend Ruff lint/import sorting |
| `pnpm format` | Formats backend Python with Ruff; it does not format frontend files |
| `pnpm format:check` | Read-only Ruff formatting check |
| `pnpm test` | Frontend Jest plus backend pytest excluding `backend/tests/integration/` |
| `pnpm build` | Next.js production build/TypeScript validation plus backend bytecode compilation |
| `pnpm check` | Lint, format check, default tests, contract freshness, frontend build, and backend compile |

`pnpm check` is the canonical safe pre-commit command. It is designed to remain
PostgreSQL-free and does not run integration tests, E2E, database creation,
Alembic migrations, development servers, or GitHub Actions.

Run PostgreSQL integration and Playwright explicitly when the change requires
them.

## Testing

### Default unit and component tests

```bash
pnpm test
```

This runs frontend Jest/React Testing Library tests and backend pytest while
explicitly excluding `backend/tests/integration/`.

Run either side independently:

```bash
pnpm test:frontend
pnpm test:backend
```

### PostgreSQL integration tests

```bash
pnpm test:backend:integration
```

This suite uses real PostgreSQL and real Alembic. The dedicated database must
already exist and be reachable. The command fails rather than skips when the
database is unavailable. It verifies migrations, table constraints,
repository behavior, row-lock concurrency, and model/Alembic parity.

### Browser-to-database E2E

Install the repository-managed Chromium build once with the command for your
platform.

macOS and Windows:

```bash
pnpm playwright:install
```

Linux:

```bash
pnpm exec playwright install --with-deps chromium
```

The Linux command installs Chromium together with its required operating-system
dependencies. Installing those system packages may require elevated permissions,
depending on the Linux environment.

Then run:

```bash
pnpm test:e2e
```

The E2E command:

1. validates the dedicated database URL before starting servers;
2. creates only the specifically missing validated database when permitted;
3. upgrades it to Alembic head and removes existing Project rows;
4. starts fresh backend and frontend processes with server reuse disabled;
5. runs one Chromium worker through create, update, archive, and read-only UI
   states;
6. removes Project rows during teardown and shuts both servers down.

It never drops or downgrades the E2E database. Local failure screenshots and
traces are written under `e2e/test-results/`; video is disabled. In CI,
Playwright retries once and records a trace on the first retry.

## GitHub Actions

`.github/workflows/ci.yml` runs:

- on every pull request;
- on pushes to `main`;
- through manual `workflow_dispatch`.

One `Quality, PostgreSQL, and Playwright` job:

1. checks out the repository;
2. installs and caches pnpm and uv dependencies;
3. runs `pnpm check` with unreachable database URLs to enforce isolation;
4. upgrades the integration database through Alembic;
5. runs the explicit PostgreSQL integration suite;
6. installs managed Chromium and Linux browser dependencies;
7. runs the existing E2E workflow against a separately named database;
8. always attempts to upload `e2e/test-results/` as
   `playwright-test-results` for seven days.

Missing artifact files are ignored, so a clean run without screenshots or traces
remains green. Failed-run screenshots and retry traces are retained when they
exist. The PostgreSQL service, integration target, and E2E target are isolated
from normal application data.

## Project reference implementation

The Project vertical slice demonstrates how one domain travels through every
layer:

- `backend/app/database/tables/project.py` defines the PostgreSQL model.
- `backend/app/repositories/project.py` owns queries and mutation row locks.
- `backend/app/services/project.py` owns lifecycle policy and transactions.
- `backend/app/schemas/project.py` defines public request/response contracts.
- `backend/app/api/routes/projects.py` exposes the versioned HTTP API.
- `backend/openapi.json` and `frontend/lib/api/generated/` carry the contract.
- `frontend/app/(dashboard)/projects/` and
  `frontend/components/projects/` implement the responsive workspace.
- `e2e/tests/project-management.spec.ts` proves the UI lifecycle through
  PostgreSQL.

A Project record includes a UUID identifier, required name, nullable
description, bounded lifecycle status (`planned`, `active`, `completed`, or
`archived`), optional due date, and creation and update timestamps.

Available operations:

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/projects` | List Projects |
| `GET` | `/api/v1/projects/{project_id}` | Read one Project, including archived records |
| `POST` | `/api/v1/projects` | Create a planned, active, or completed Project |
| `PATCH` | `/api/v1/projects/{project_id}` | Partially update a non-archived Project |
| `POST` | `/api/v1/projects/{project_id}/archive` | Archive a non-archived Project |
| `POST` | `/api/v1/projects/{project_id}/restore` | Restore an archived Project to `planned` |

Names are required and trimmed, due dates are optional, direct creation or
updates to `archived` are rejected, missing records return normalized `404`
errors, and invalid lifecycle actions return `409 Conflict`. Update, archive,
and restore acquire `SELECT ... FOR UPDATE` locks; read-only list and get
operations do not.

The current UI provides create, edit, archive, loading, empty, error, and
archived read-only states across mobile and desktop layouts. Restore is exposed
by the API and generated client but intentionally has no frontend button. The
E2E test covers create, update, archive, and archived presentation.

Remove or replace this example when starting a different product, while
preserving the layer boundaries and contract workflow.

## Development standards

| Document | Purpose |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | System boundaries, request flow, transactions, and generated contracts |
| [docs/api-standards.md](docs/api-standards.md) | Versioning, schemas, errors, status codes, and API conventions |
| [docs/coding-standards.md](docs/coding-standards.md) | TypeScript, Python, naming, imports, and configuration rules |
| [docs/database-standards.md](docs/database-standards.md) | SQLAlchemy, PostgreSQL, migrations, constraints, and transactions |
| [docs/testing-standards.md](docs/testing-standards.md) | Test layers, isolation, CI, and E2E database safety |
| [docs/contributing.md](docs/contributing.md) | Branches, commits, pull requests, validation, and changelog workflow |
| [docs/project-philosophy.md](docs/project-philosophy.md) | Scope, simplicity, and production-first principles |
| [docs/changelog.md](docs/changelog.md) | Unreleased changes and future release history |
| [docs/third-party-notices.md](docs/third-party-notices.md) | Upstream design and component notices |

Architecture decisions are recorded separately under `docs/adr/`.

## Common workflows

### Start a focused feature

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Read the relevant standards, keep one concern in the branch, and finish with
`pnpm check`.

### Add a backend domain or route

1. Add or update the SQLAlchemy table and table registry when persistence is
   required.
2. Add Pydantic schemas, a concrete repository, service rules, and thin routes.
3. Register the router in `backend/app/api/router.py`.
4. Add focused service and route tests.
5. Generate and review a migration when metadata changes.
6. Export OpenAPI, regenerate the frontend client, and update consumers.

```bash
pnpm db:revision -m "add example domain"
pnpm openapi:export
pnpm api:generate
pnpm check
pnpm test:backend:integration
```

Do not create a migration for route-only or schema-only changes.

### Add a frontend feature

1. Add the App Router page or Route Handler under `frontend/app/`.
2. Keep server rendering and initial data loading in Server Components.
3. Put browser interaction in focused Client Components.
4. Use generated contracts through `frontend/lib/api/contracts.ts`.
5. Normalize errors through `frontend/lib/errors/normalize.ts`.
6. Add Jest and React Testing Library coverage.

```bash
pnpm test:frontend
pnpm lint:frontend
pnpm build:frontend
```

### Regenerate API artifacts

```bash
pnpm openapi:export
pnpm api:generate
pnpm api:check
```

### Run pre-commit validation

```bash
pnpm check
git diff --check
```

### Run database and browser validation

```bash
pnpm test:backend:integration
pnpm test:e2e
```

## Deployment notes

This repository is provider-neutral and does not include Docker, deployment
manifests, or infrastructure provisioning.

For deployment:

- deploy `frontend/` and `backend/` as separate services;
- provide a managed PostgreSQL database and least-privilege credentials;
- set `APP_ORIGIN` to the public Next.js origin;
- set `FASTAPI_INTERNAL_URL` to an origin reachable by the Next.js server;
- set backend runtime and migration URLs explicitly;
- run `pnpm db:upgrade` as a controlled release step, not on every application
  startup;
- expose `/health` for liveness and `/ready` for dependency readiness;
- build the frontend with `pnpm build:frontend`;
- serve the FastAPI entrypoint `app.main:app` from `backend/` with a production
  ASGI server;
- terminate TLS at the platform or reverse proxy and keep database connections
  private.

The root `pnpm dev` and `fastapi dev` commands are development servers. Confirm
provider-specific process management, proxy headers, trusted origins, database
pool sizing, logs, backups, and migration rollback strategy before production.

## Security notes

- There is no authentication or authorization. Every Project API endpoint is
  public to any client that can reach FastAPI.
- Keep database credentials and server-only URLs in environment variables. Never
  commit `.env` files or expose them through `NEXT_PUBLIC_` variables.
- Browser API paths are restricted to same-origin relative paths; server API
  paths cannot override `FASTAPI_INTERNAL_URL`.
- Public error boundaries normalize failures and avoid returning raw upstream
  bodies or database credentials.
- Test database guards reduce destructive mistakes but do not replace database
  permissions, network isolation, backups, or careful operator review.
- Use dedicated roles and databases for runtime, migrations, integration tests,
  and E2E where practical.
- Review generated migrations and never run destructive production operations
  without a recovery plan.
- Configure direct browser CORS only when the product genuinely needs it; the
  current same-origin architecture does not.
- Run dependency and security review processes appropriate to your deployment;
  this foundation does not claim product-specific compliance.

## Troubleshooting

### PostgreSQL connection refused

Confirm the service and configured host/port:

```bash
pg_isready -h localhost -p 5432
pnpm db:current
```

Check `backend/.env`, the PostgreSQL role, the database name, and whether another
service owns port 5432. `/health` can remain green while `/ready` correctly
returns `503`.

### Test database URL rejected

Use a dedicated PostgreSQL database with `test` as a complete underscore segment,
such as `next_fastapi_test`. Remove database-target query parameters and do not
use a development or production name. Rejections intentionally hide URL
credentials.

### PostgreSQL integration database is unreachable

`pnpm test:backend:integration` fails instead of skipping. Start PostgreSQL,
create the configured test database, verify `TEST_DATABASE_URL`, and rerun the
command.

### OpenAPI contract is stale

```bash
pnpm openapi:export
pnpm openapi:check
```

Review the deterministic `backend/openapi.json` diff before regenerating the
frontend client.

### Generated frontend client is stale

```bash
pnpm api:generate
pnpm api:check
```

Do not patch generated files manually.

### Port 3000 or 8000 is occupied

```bash
lsof -iTCP:3000 -sTCP:LISTEN
lsof -iTCP:8000 -sTCP:LISTEN
```

Stop the owning process intentionally, then restart `pnpm dev`. Playwright
refuses to reuse existing servers so it cannot silently test stale code.

### Playwright browser is missing

Run the platform-specific installation command in
[Browser-to-database E2E](#browser-to-database-e2e), then retry the test.

### E2E left a stale development server

Stop any separately started `pnpm dev`, frontend, or backend process before
running E2E. The Playwright configuration starts fresh processes and requests
graceful shutdown; a process launched outside Playwright is not owned by that
run.

### Migration command targets the wrong database

Inspect `DATABASE_URL` and `DATABASE_MIGRATION_URL`. A non-empty migration URL
wins; blank or unset falls back to the runtime URL. Do not run upgrade or
downgrade until the target is unambiguous.

### Swagger reports “Failed to fetch”

Verify the backend is reachable:

```bash
curl -i http://127.0.0.1:8000/health
```

Open Swagger at <http://127.0.0.1:8000/docs> and keep its origin consistent.
A valid but missing Project UUID should return a normalized HTTP `404`; that is
an application response, not a transport or CORS failure.

## Template customization

When adapting the foundation:

1. rename root, frontend, backend, and application metadata;
2. choose and add a repository license;
3. replace or remove the Project model, migration, schemas, repository, service,
   routes, generated contract, frontend workspace, and E2E test together;
4. add new tables through the registry and Alembic rather than `create_all()`;
5. update environment examples, local database names, origins, and any future
   CORS policy;
6. export OpenAPI and regenerate the frontend client after API changes;
7. preserve the standard error envelope, request IDs, test-database guards, and
   test isolation;
8. keep `pnpm check`, integration tests, E2E, and CI green;
9. update architecture, standards, notices, and changelog entries that no longer
   match the customized product.

For a fresh, unpublished copy you may simplify the sample migration history
before deploying. Once any migration has been applied to a shared environment,
create new revisions instead of rewriting history.

### Cleanup checklist

- [ ] Rename package names, descriptions, application metadata, and database
      names.
- [ ] Add an explicit repository license suitable for the new project.
- [ ] Replace or deliberately retain the Project example.
- [ ] Update `frontend/.env.example` and `backend/.env.example`.
- [ ] Update public/internal origins and review any direct-browser CORS need.
- [ ] Regenerate `backend/openapi.json` and the frontend API client.
- [ ] Review migrations and apply them to a new empty database.
- [ ] Update documentation and third-party notices.
- [ ] Run `pnpm check`, PostgreSQL integration tests, and Playwright E2E.
- [ ] Confirm no sample secrets, personal paths, or local data are tracked.

This checklist prepares a local copy for customization; it does not perform the
repository publishing and template-setting work planned for the next roadmap
checkpoint.

## Contributing

Read [docs/contributing.md](docs/contributing.md) before opening a change. Keep
branches and commits focused, update tests and contracts with behavior changes,
run `pnpm check`, run explicit database/E2E validation when relevant, and keep
the unreleased changelog accurate.

Every pull request is validated by the full-stack GitHub Actions workflow. Do
not merge while required checks or review findings remain unresolved.

## Roadmap and status

[INSTRUCTIONS.md](INSTRUCTIONS.md) is the implementation roadmap and current
checkpoint source of truth. Steps 20 through 28 are complete. Template
repository preparation and the 1.0.0 release remain unstarted.

## License and notices

This repository does not currently include a repository-level license file.
Until a license is selected and added, do not assume the repository itself is
licensed for unrestricted reuse or redistribution.

Third-party design and component notices, including their upstream MIT license
texts, are recorded in
[docs/third-party-notices.md](docs/third-party-notices.md). Those notices apply
to the identified upstream materials and do not grant a license for the
repository as a whole.
