# Next.js FastAPI Foundation Build Instructions

## Purpose

This file is the master build plan for creating a reusable GitHub template that connects:

- Next.js App Router
- FastAPI
- PostgreSQL
- SQLAlchemy 2
- Alembic
- OpenAPI-generated frontend types and API functions
- Jest and React Testing Library
- Pytest
- Playwright
- GitHub Actions

The project will remain intentionally simple:

- One Git repository
- One `frontend/` application
- One `backend/` application
- One root command that starts both
- No Turborepo
- No Docker in the first build
- No Supabase dependency
- No `src/` directory in the Next.js application
- No authentication until the core connection is stable

## How We Will Use This File

We will complete one numbered step at a time.

For every step:

1. Run only the commands listed for that step.
2. Stop at the checkpoint.
3. Share the complete terminal output.
4. Do not continue when an error appears.
5. Fix the current step before moving forward.
6. Mark the step complete in this file after verification.
7. Update `docs/changelog.md` under `[Unreleased]` when the step delivers a meaningful change (see the Changelog Rule below).
8. Commit only at the checkpoints identified in this plan.

Do not skip ahead. A later step may depend on files created or verified in an earlier step.

---

# Final Project Shape

```text
nextjs-fastapi-foundation/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   │   └── api/
│   │       ├── generated/
│   │       ├── browser.ts
│   │       ├── errors.ts
│   │       └── server.ts
│   ├── public/
│   ├── tests/
│   ├── .env.example
│   ├── jest.config.ts
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py
│   │   │   ├── errors.py
│   │   │   └── routes/
│   │   ├── core/
│   │   ├── database/
│   │   │   └── tables/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── scripts/
│   │   └── export_openapi.py
│   ├── tests/
│   ├── .env.example
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── uv.lock
├── e2e/
├── .github/
│   └── workflows/
├── .env.example
├── .gitignore
├── INSTRUCTIONS.md
├── LICENSE
├── package.json
└── README.md
```

Directories should be created only when a step needs them. We will not generate empty architecture folders simply to make the repository look larger.

---

# Decisions Already Locked

## Repository

- Git monorepo
- Side-by-side `frontend/` and `backend/`
- Root convenience scripts
- No workspace orchestrator

## Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- No `src/` directory
- Import alias `@/*`
- Server Components by default
- Client Components only when browser interaction is required
- Server Actions for frontend-originated mutations where appropriate

## Backend

- FastAPI
- Python managed by `uv`
- SQLAlchemy 2 async API
- Psycopg 3
- PostgreSQL
- Alembic
- Pydantic Settings
- Pytest

## Connection

- Browser requests use `/api/...` through a Next.js rewrite
- Server Components and Server Actions call FastAPI directly through `FASTAPI_INTERNAL_URL`
- OpenAPI generates frontend request and response types
- FastAPI routes are versioned under `/api/v1`

## Testing

- Jest
- React Testing Library
- Pytest
- Playwright
- No Vitest

---

## Foundation Boundary

Version one provides a complete, working full-stack foundation.

It must work without authentication, multi-tenancy, billing, storage, or other product-specific integrations.

Those capabilities may be added later without changing the core Next.js → FastAPI → SQLAlchemy → PostgreSQL architecture.

Rules that follow from this:

1. Version one must be usable without auth or multi-tenancy.
2. The frontend and backend connection must be fully implemented and tested before optional product features are considered.
3. The Project Management vertical slice must remain small and removable.
4. Authentication, multi-tenancy, billing, storage, and similar features are post-foundation extensions.
5. Step 11 remains domain-neutral.
6. Steps 22-25 prove the architecture but do not turn the repository into a complete Project Management product.

---

# Build Roadmap

## Phase A: Repository foundation

## Step 1: Verify the computer and create the empty repository

**Goal:** Confirm the required tools exist and create a clean repository folder.

Tasks:

- Verify Git
- Verify Node.js
- Verify pnpm
- Verify Python
- Verify uv
- Verify PostgreSQL client tools
- Create the project directory
- Initialize Git
- Create this `INSTRUCTIONS.md`
- Create the initial root `.gitignore`
- Make the initial commit

Checkpoint:

- Empty repository exists
- Git working tree is clean
- Required tool versions are recorded
- No frontend or backend exists yet

Commit:

```text
chore: initialize boilerplate repository
```

## Step 2: Define project development standards

**Goal:** Document the project rules before generating application code.

Documents:

- `docs/architecture.md`
- `docs/coding-standards.md`
- `docs/api-standards.md`
- `docs/database-standards.md`
- `docs/testing-standards.md`
- `docs/contributing.md`

Checkpoint:

- All six standards documents exist.
- Architecture and responsibilities are documented.
- API, database, testing, and contribution rules are documented.
- Working tree is clean after the standards commit.

Commit:

```text
docs: define project development standards
```

## Step 3: Create the Next.js frontend

**Goal:** Generate the official Next.js application without a `src/` directory.

Expected choices:

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Turbopack: Yes
- Import alias: `@/*`
- Package manager: pnpm

Checkpoint:

- `frontend/` starts successfully
- Home page loads on port 3000
- Lint passes
- Production build passes

Commit:

```text
feat(frontend): add Next.js application
```

## Step 4: Create the FastAPI backend

**Goal:** Generate the official FastAPI application and verify it runs independently.

Tasks:

- Generate `backend/`
- Confirm `uv` created or manages the project environment
- Start FastAPI on port 8000
- Verify `/docs`
- Verify `/openapi.json`
- Run backend tests if the scaffold includes them

Checkpoint:

- Backend starts without errors
- OpenAPI schema is available
- API documentation loads

Commit:

```text
feat(backend): add FastAPI application
```

## Step 5: Add root development commands

**Goal:** Start both applications with one root command.

Tasks:

- Create the root `package.json`
- Install `concurrently`
- Add `dev`, `dev:frontend`, and `dev:backend`
- Ensure one process stops when the other fails
- Commit the root package files only after the shared development command has been verified

Checkpoint:

- `pnpm dev` starts ports 3000 and 8000
- Logs are clearly labeled
- Ctrl+C stops both processes
- Root package files are committed before continuing

Commit:

```text
chore: add root development commands
```

## Phase B: Backend foundation

## Step 6: Normalize the FastAPI application structure

**Goal:** Create a small, understandable backend layout.

Target areas:

- `app/api/`
- `app/api/routes/`
- `app/core/`
- `app/database/`
- `app/schemas/`
- `app/services/`
- `tests/`

Tasks:

- Add `/health`
- Add `/ready`
- Add `/api/v1` router
- Add request ID middleware
- Add standard error response shape
- Preserve FastAPI docs

Checkpoint:

- `/health` returns success
- `/ready` returns an expected pre-database status
- `/api/v1` routing works
- Tests pass

Commit:

```text
feat(api): add versioned API foundation
```

## Step 7: Add settings and environment validation

**Goal:** Fail clearly when required configuration is missing.

Backend variables:

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi
CORS_ORIGINS=http://localhost:3000
```

Frontend variables:

```env
FASTAPI_INTERNAL_URL=http://127.0.0.1:8000
```

Tasks:

- Add backend Pydantic Settings
- Add frontend environment validation
- Add `.env.example` files
- Confirm secrets are excluded by Git

Checkpoint:

- Both applications start with valid settings
- Missing required settings produce understandable errors
- No real `.env` file is tracked

Commit:

```text
feat(config): add validated environment settings
```

## Step 8: Add structured logging and request IDs

**Goal:** Make backend requests observable before the application grows.

Tasks:

- Add request ID middleware or context propagation
- Add structured logging around requests and errors
- Include the request ID in error responses and logs
- Keep logs safe by excluding secrets

Checkpoint:

- Every request gets a request ID
- Logs are structured and readable
- Sensitive values remain excluded from logs

Commit:

```text
feat(api): add structured logging and request IDs
```

## Step 9: Add health and readiness endpoints

**Goal:** Make the application status explicit for local development and deployment.

Tasks:

- Add `/health` for process health
- Add `/ready` for readiness after dependencies are available
- Keep health checks lightweight and dependency-free
- Make readiness reflect the database state when available

Checkpoint:

- `/health` returns success quickly
- `/ready` reports the application state clearly
- The endpoints remain documented in FastAPI

Commit:

```text
feat(api): add health and readiness endpoints
```

## Step 10: Add standard application error handling

**Goal:** Return consistent, testable errors from the backend.

Tasks:

- Define a standard error response shape
- Translate service and validation failures into that shape
- Include request IDs in the response body
- Keep the error layer centralized

Checkpoint:

- Backend errors follow one predictable contract
- Frontend consumers can normalize responses consistently
- Validation failures remain readable

Commit:

```text
feat(api): add standard error handling
```

## Step 11: Add PostgreSQL and async SQLAlchemy

**Goal:** Establish a generic, reusable async database foundation.

Keep Step 11 limited to the PostgreSQL engine, async session factory, SQLAlchemy metadata, database dependency injection, and readiness database check. Save the Project model, repository, schemas, service, migration, and routes for the Project Management vertical slice so the database foundation remains generic and reusable.

Dependencies:

- SQLAlchemy 2
- Psycopg 3
- Pydantic Settings if not already installed

Tasks:

- Create the async PostgreSQL engine
- Create `async_sessionmaker`
- Create SQLAlchemy declarative metadata and `Base`
- Add deterministic constraint naming
- Create a FastAPI dependency that yields one async database session per request
- Add a lightweight database connectivity check
- Integrate the connectivity check into `/ready`
- Configure the engine and pool from environment settings
- Avoid `create_all()` in application startup
- Document and validate the generic foundation

Explicitly out of scope for this step:

- Project table or model
- Repository implementations
- Project schemas
- Project service
- Project routes
- Project migrations
- Seed data
- Authentication
- Multi-tenancy
- Generic repository abstractions that have no current consumer

Checkpoint:

- FastAPI connects to PostgreSQL
- `/ready` verifies the database
- Invalid database configuration produces a clear failure
- Tests can override the database dependency
- No Project-specific code exists yet

Commit:

```text
feat(database): add async PostgreSQL foundation
```

## Step 12: Add Alembic migrations

**Goal:** Make migrations the only supported way to change the schema.

Keep Step 12 limited to Alembic infrastructure. Do not add the Project table migration in Step 12 — that belongs to the Project Management vertical slice.

Tasks:

- Install Alembic in the backend project
- Initialize Alembic
- Configure it from application settings
- Connect Alembic to SQLAlchemy metadata
- Support async database configuration
- Add root migration commands
- Create an initial empty or baseline migration (infrastructure only, no Project table)

Root commands:

```text
pnpm db:revision
pnpm db:upgrade
pnpm db:downgrade
pnpm db:current
pnpm db:history
```

Checkpoint:

- Alembic can inspect the configured database
- Upgrade to head succeeds
- Downgrade succeeds in development
- Upgrade succeeds again
- No schema is created through `create_all()`

Commit:

```text
feat(database): add Alembic migrations
```

## Step 13: Add backend test foundation

**Goal:** Make backend behavior safe to change.

Tests:

- Health route
- Readiness route
- Service behavior
- Route behavior
- Validation
- Not found
- Database rollback or isolation
- Dependency overrides

Checkpoint:

- `uv run pytest` passes
- Tests do not modify a shared production database
- Failures clearly identify the broken behavior

Commit:

```text
test(api): add backend test foundation
```

## Phase C: Frontend foundation

## Step 14: Add frontend environment validation

**Goal:** Make the frontend configuration explicit before integration work begins.

Tasks:

- Add browser-safe and server-safe environment validation helpers
- Keep `NEXT_PUBLIC_` usage limited to values that must reach the browser
- Keep server-only values out of the client bundle
- Document required variables in `.env.example`

Checkpoint:

- Frontend configuration fails clearly when variables are missing
- Client and server values are separated correctly
- The frontend can start with the expected environment contract

Commit:

```text
feat(frontend): add environment validation
```

## Step 15: Add browser and server API client layers

**Goal:** Prepare the frontend for both browser and server requests.

Tasks:

- Add `lib/api/browser.ts` for same-origin browser requests
- Add `lib/api/server.ts` for direct FastAPI calls
- Keep browser requests on `/api/...`
- Keep server-side requests direct through `FASTAPI_INTERNAL_URL`

Checkpoint:

- Browser code uses the same-origin rewrite path
- Server code uses the direct internal FastAPI URL
- Both layers are ready for feature work

Commit:

```text
feat(frontend): add API client layers
```

## Step 16: Add frontend error normalization

**Goal:** Make API failures presentable and consistent in the UI.

Tasks:

- Normalize backend errors into one frontend-facing shape
- Keep error handling central and reusable
- Preserve helpful details without leaking sensitive data

Checkpoint:

- Frontend code can handle backend errors with one shared path
- Loading and empty states remain separate from error handling
- Error UI components can be reused safely

Commit:

```text
feat(frontend): add API error normalization
```

## Step 17: Add Jest and React Testing Library

**Goal:** Establish frontend unit and component testing early.

Tests:

- API error normalization
- Validation helpers
- Component rendering
- Loading and empty states
- Basic user interactions

Checkpoint:

- Jest passes
- React Testing Library passes
- Tests do not require a production backend unless explicitly integration tests

Commit:

```text
test(frontend): add Jest and React Testing Library
```

## Phase D: Application integration

## Step 18: Connect Next.js and FastAPI

**Goal:** Prove the two applications can communicate through the planned runtime paths.

Tasks:

- Add Next.js rewrite for browser requests
- Add a frontend page that reads FastAPI health
- Keep server-side requests direct
- Keep browser-side requests same-origin

Checkpoint:

- Browser request reaches FastAPI through `/api`
- Server Component reaches FastAPI directly
- No development CORS error
- FastAPI request logs prove both paths work

Commit:

```text
feat(api-client): connect Next.js and FastAPI
```

## Step 19: Add deterministic OpenAPI export

**Goal:** Make API contracts reproducible and reviewable.

Tasks:

- Export OpenAPI deterministically from FastAPI
- Keep the export command local and scriptable
- Preserve versioned routing in the exported schema

Checkpoint:

- OpenAPI export is stable across runs
- Backend route changes are reflected in the generated schema
- The export path is documented for contributors

Commit:

```text
feat(api): add deterministic OpenAPI export
```

## Step 20: Generate the frontend API client

**Goal:** Remove duplicated handwritten API contracts.

Tasks:

- Install the selected OpenAPI TypeScript generator
- Generate into `frontend/lib/api/generated/`
- Wrap generated calls only where application behavior is needed
- Do not manually edit generated files

Checkpoint:

- Changing a Pydantic response changes generated TypeScript
- Frontend build uses generated types
- Backend does not need to be manually running during CI generation

Commit:

```text
feat(api-client): generate frontend client
```

## Step 21: Add API contract freshness checks

**Goal:** Keep the generated frontend client current.

Tasks:

- Add `api:check` or similar validation command
- Fail when generated output is stale
- Document the regeneration workflow for contributors

Checkpoint:

- Stale generated output fails the check
- Frontend and backend contracts remain aligned
- CI can guard against drift

Commit:

```text
chore(api-client): add contract freshness checks
```

## Phase E: First vertical slice

## Step 22: Build the Project database model and migration

**Goal:** Prove the backend can persist a real domain object.

Tasks:

- Add a SQLAlchemy Project table with `id`, `name`, `description`, `status`, `due_date`, `created_at`, `updated_at`
- Add an Alembic migration for the table
- Choose deterministic constraint names and UUID primary keys
- Default `status` to `planned`, with allowed values `planned`, `active`, `completed`, `archived`
- Keep the model and migration together

Checkpoint:

- The migration applies successfully
- The Project table exists in PostgreSQL
- The schema change is reviewable and versioned

Commit:

```text
feat(database): add Project model and migration
```

## Step 23: Add Project repository, schemas, service, and routes

**Goal:** Expose the Project domain through the API.

Tasks:

- Add Pydantic request and response schemas
- Add a Project repository for persistence access
- Add a Project service with business rules
- Add routes under `/api/v1/projects`:
  - `GET /api/v1/projects`
  - `GET /api/v1/projects/{project_id}`
  - `POST /api/v1/projects`
  - `PATCH /api/v1/projects/{project_id}`
  - `POST /api/v1/projects/{project_id}/archive`
- Enforce business rules:
  - Project name is required.
  - Status defaults to `planned`.
  - Archived projects cannot be edited.
  - Any non-archived project may be archived.
  - Due date is optional.
  - Invalid lifecycle actions return `409 Conflict`.
- Return consistent errors and validation responses
- Keep the vertical slice limited to one Project table (no tasks, members, comments, attachments, authentication, organizations, notifications, kanban behavior, or time tracking)

Checkpoint:

- Project endpoints work end to end through FastAPI
- Validation errors are predictable
- Missing resources return standard 404 behavior
- Invalid lifecycle actions return 409 Conflict

Commit:

```text
feat(api): add Project repository, schemas, service, and routes
```

## Step 24: Add the Project Management frontend

**Goal:** Show the Project Management workflow in the Next.js application.

Tasks:

- Add a Project list page
- Add create, edit, and archive flows
- Add loading, empty, and error states
- Keep UI logic clear and testable

Checkpoint:

- The Project Management flow works from the browser UI
- The frontend uses the generated API client and shared error handling
- The feature is ready for end-to-end verification

Commit:

```text
feat(frontend): add Project Management feature
```

## Step 25: Add Project Management Playwright coverage

**Goal:** Verify the complete user path.

Flow:

1. Start frontend
2. Start backend
3. Use a dedicated test database
4. Open the Project Management page
5. Create a Project
6. Confirm it appears
7. Update it
8. Archive it
9. Confirm it shows as archived

Checkpoint:

- Full flow passes from browser to PostgreSQL
- Test data is isolated
- Test can run locally and in CI

Commit:

```text
test(e2e): add full-stack Playwright coverage
```

## Phase F: Repository completion

## Step 26: Add root quality and validation commands

**Goal:** Give contributors one predictable validation workflow.

Root commands:

```text
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
pnpm build
pnpm check
```

`pnpm check` should run the safe pre-commit validations.

Checkpoint:

- Frontend lint passes
- Backend Ruff checks pass
- Backend formatting check passes
- All unit tests pass
- Both applications build or validate successfully

Commit:

```text
chore: add repository quality checks
```

## Step 27: Add GitHub Actions

**Goal:** Validate every pull request.

CI jobs:

- Frontend lint and test
- Frontend build
- Backend lint and test
- PostgreSQL service
- Alembic upgrade
- OpenAPI client freshness
- End-to-end test
- Dependency caching

Checkpoint:

- Clean branch produces green CI
- Stale generated client fails CI
- Broken migration fails CI
- Broken frontend or backend test fails CI

Commit:

```text
ci: add full-stack GitHub Actions
```

## Step 28: Write the complete template README

**Goal:** Make a new user successful without needing private guidance.

The README must include:

1. Project summary
2. Architecture diagram
3. Technology list
4. What is included
5. What is deliberately excluded
6. Prerequisites
7. Use Template instructions
8. Local installation
9. Environment variables
10. PostgreSQL setup
11. Database migration commands
12. Starting both applications
13. Frontend-to-backend communication
14. OpenAPI client generation
15. Testing
16. GitHub Actions
17. Directory structure
18. Adding a new backend domain
19. Adding a new frontend feature
20. Deployment notes
21. Troubleshooting
22. Security notes
23. Contribution instructions
24. License
25. Template cleanup checklist

Checkpoint:

- A new developer can clone the repository and run it using only the README
- Every copied command has been tested
- No private machine paths appear
- No unstated environment variables are required
- Screenshots are optional, not required for setup

Commit:

```text
docs: add complete project documentation
```

## Step 29: Prepare the GitHub template

**Goal:** Make the repository safe and easy to reuse.

Tasks:

- Add an MIT license unless another license is selected
- Remove personal names, paths, secrets, and test data
- Add issue templates if useful
- Add pull request template
- Add repository topics
- Enable GitHub template repository setting
- Test “Use this template” into a temporary repository
- Follow the README from a clean clone
- Verify all commands again

Checkpoint:

- Template-generated repository starts successfully
- Git history does not contain secrets
- README instructions work from a clean machine state
- CI passes in the generated test repository

Commit:

```text
chore: prepare repository as GitHub template
```

## Step 30: Release version 1.0.0

**Goal:** Publish the first stable template release.

Tasks:

- Confirm all checkpoints
- Update changelog
- Create `v1.0.0`
- Create GitHub release notes
- Record supported versions
- Document known limitations

Checkpoint:

- Main branch is clean
- CI is green
- Template generation has been tested
- Release is published

---

# README Quality Standard

The final README should answer these questions immediately:

- What does this repository create?
- Who is it for?
- What is already connected?
- Which commands do I run first?
- Which ports are used?
- Where do environment values go?
- How do I create the database?
- How do I run migrations?
- How do Next.js and FastAPI communicate?
- How do I regenerate the API client?
- How do I add a model and endpoint?
- How do I test everything?
- How do I deploy it?
- How do I use it as a GitHub template?

Every command shown in the README must be copied from a verified project command. The README must never document a command that has not been executed successfully.

---

# Changelog Rule

Before committing a meaningful completed step:

1. Update `docs/changelog.md` under `[Unreleased]`.
2. Use the correct category.
3. Describe the delivered capability.
4. Include the implementation commit hash when available.
5. Verify the changelog does not duplicate an existing entry.

Because the implementation commit hash is not known before committing, the accepted workflow is:

```text
Implementation and changelog commit
    ↓
Optional focused changelog hash follow-up
```

Formatting-only, typo-only, and temporary investigative commits do not require changelog entries.

---

# Safety Rules

- Never commit `.env` files.
- Never commit database passwords.
- Never use a production database for automated tests.
- Never run Alembic downgrades against production without a reviewed plan.
- Never edit generated OpenAPI client files manually.
- Never use `Base.metadata.create_all()` as a replacement for Alembic.
- Never hardcode localhost URLs inside application feature code.
- Never place browser secrets in variables beginning with `NEXT_PUBLIC_`.
- Never continue to the next step while the current checkpoint is failing.
- Never add a framework or service only because it might be useful someday.

---

# Current Progress

- [x] Architecture discussed
- [x] PostgreSQL selected as the default database
- [x] Supabase removed from the core
- [x] No `src/` directory selected
- [x] Simple duplex monorepo selected
- [x] Step 1: Verify tools and initialize repository
- [x] Step 2: Define project development standards
- [x] Step 3: Create Next.js frontend
- [x] Step 4: Create FastAPI backend
- [x] Step 5: Add root development commands
- [x] Step 6: Normalize the FastAPI application structure
- [x] Step 7: Add settings and environment validation
- [x] Step 8: Add structured logging and request IDs
- [x] Step 9: Add health and readiness endpoints
- [x] Step 10: Add standard application error handling
- [ ] Step 11: Add PostgreSQL and async SQLAlchemy
- [ ] Step 12: Add Alembic migrations
- [ ] Step 13: Add backend test foundation
- [ ] Step 14: Add frontend environment validation
- [ ] Step 15: Add browser and server API client layers
- [ ] Step 16: Add frontend error normalization
- [ ] Step 17: Add Jest and React Testing Library
- [ ] Step 18: Connect Next.js and FastAPI
- [ ] Step 19: Add deterministic OpenAPI export
- [ ] Step 20: Generate the frontend API client
- [ ] Step 21: Add API contract freshness checks
- [ ] Step 22: Build the Project database model and migration
- [ ] Step 23: Add Project repository, schemas, service, and routes
- [ ] Step 24: Add the Project Management frontend
- [ ] Step 25: Add Project Management Playwright coverage
- [ ] Step 26: Add root quality and validation commands
- [ ] Step 27: Add GitHub Actions
- [ ] Step 28: Write the complete template README
- [ ] Step 29: Prepare the GitHub template
- [ ] Step 30: Release version 1.0.0

---

# Resume Point

The next action is:

> **Step 11: Add PostgreSQL and async SQLAlchemy.**

Keep Step 11 limited to the engine, session factory, metadata, dependency injection, and readiness database check. Do not begin Project domain implementation until the Project Management vertical slice.
