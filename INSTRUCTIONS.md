# Next.js + FastAPI + PostgreSQL Boilerplate Build Instructions

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
7. Commit only at the checkpoints identified in this plan.

Do not skip ahead. A later step may depend on files created or verified in an earlier step.

---

# Final Project Shape

```text
next-fastapi-postgres/
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

# Build Roadmap

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

Checkpoint:

- `pnpm dev` starts ports 3000 and 8000
- Logs are clearly labeled
- Ctrl+C stops both processes

Commit:

```text
chore: add root development commands
```

## Step 6: Normalize the FastAPI structure

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

## Step 8: Connect the frontend and backend

**Goal:** Prove Next.js can reach FastAPI through both supported paths.

Tasks:

- Add Next.js rewrite for browser requests
- Add `lib/api/browser.ts`
- Add `lib/api/server.ts`
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

## Step 9: Add PostgreSQL and SQLAlchemy

**Goal:** Establish the async database layer.

Dependencies:

- SQLAlchemy 2
- Psycopg 3
- Pydantic Settings if not already installed

Tasks:

- Create async engine
- Create async session factory
- Create one database session per request
- Add deterministic constraint naming
- Add database readiness check
- Avoid `create_all()` in application startup

Checkpoint:

- FastAPI connects to PostgreSQL
- `/ready` verifies the database
- Invalid database configuration produces a clear failure
- Tests can override the database dependency

Commit:

```text
feat(database): add async PostgreSQL foundation
```

## Step 10: Add Alembic

**Goal:** Make migrations the only supported way to change the schema.

Tasks:

- Install Alembic in the backend project
- Initialize Alembic
- Configure it from application settings
- Connect Alembic to SQLAlchemy metadata
- Support async database configuration
- Add root migration commands
- Create an initial empty or baseline migration

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

## Step 11: Build the Todo vertical slice

**Goal:** Prove the entire stack works through one complete feature.

Backend:

- SQLAlchemy Todo table
- Alembic migration
- Pydantic request schemas
- Pydantic response schema
- Todo service
- CRUD routes
- Pagination
- Validation
- Standard 404 behavior

Frontend:

- Todo list page
- Create form
- Edit flow
- Delete flow
- Loading state
- Error state
- Empty state

Endpoints:

```text
GET    /api/v1/todos
GET    /api/v1/todos/{todo_id}
POST   /api/v1/todos
PUT    /api/v1/todos/{todo_id}
DELETE /api/v1/todos/{todo_id}
```

Checkpoint:

- Todo can be created from Next.js
- Todo appears in PostgreSQL
- Todo can be read, updated, and deleted
- Validation errors display correctly
- Backend tests pass

Commit:

```text
feat(todos): add full-stack Todo example
```

## Step 12: Generate the OpenAPI client

**Goal:** Remove duplicated handwritten API contracts.

Tasks:

- Export OpenAPI deterministically from FastAPI
- Install the selected OpenAPI TypeScript generator
- Generate into `frontend/lib/api/generated/`
- Add `api:generate`
- Add `api:check`
- Wrap generated calls only where application behavior is needed
- Do not manually edit generated files

Checkpoint:

- Changing a Pydantic response changes generated TypeScript
- Stale generated output fails the check
- Frontend build uses generated types
- Backend does not need to be manually running during CI generation

Commit:

```text
feat(api-client): generate client from OpenAPI
```

## Step 13: Add backend tests

**Goal:** Make backend behavior safe to change.

Tests:

- Health route
- Readiness route
- Todo service
- Todo routes
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

## Step 14: Add frontend tests

**Goal:** Test frontend logic and interactive components.

Tests:

- API error normalization
- Todo form validation
- Todo components
- Loading and empty states
- Client-side interactions

Checkpoint:

- Jest passes
- React Testing Library passes
- Tests do not require a production backend unless explicitly integration tests

Commit:

```text
test(frontend): add Jest and component tests
```

## Step 15: Add Playwright end-to-end testing

**Goal:** Verify the complete user path.

Flow:

1. Start frontend
2. Start backend
3. Use a dedicated test database
4. Open the Todo page
5. Create a Todo
6. Confirm it appears
7. Update it
8. Delete it
9. Confirm it is gone

Checkpoint:

- Full flow passes from browser to PostgreSQL
- Test data is isolated
- Test can run locally and in CI

Commit:

```text
test(e2e): add full-stack Playwright coverage
```

## Step 16: Add code-quality commands

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

## Step 17: Add GitHub Actions

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

## Step 18: Write the template-quality README

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

## Step 19: Prepare the GitHub template

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

## Step 20: Tag version 1.0.0

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
- [ ] Step 3: Create Next.js frontend
- [ ] Step 4: Create FastAPI backend
- [ ] Step 5: Add root development commands
- [ ] Step 6: Normalize FastAPI structure
- [ ] Step 7: Add environment validation
- [ ] Step 8: Connect frontend and backend
- [ ] Step 9: Add PostgreSQL and SQLAlchemy
- [ ] Step 10: Add Alembic
- [ ] Step 11: Build Todo vertical slice
- [ ] Step 12: Generate OpenAPI client
- [ ] Step 13: Add backend tests
- [ ] Step 14: Add frontend tests
- [ ] Step 15: Add Playwright
- [ ] Step 16: Add quality commands
- [ ] Step 17: Add GitHub Actions
- [ ] Step 18: Write complete README
- [ ] Step 19: Prepare GitHub template
- [ ] Step 20: Release version 1.0.0

---

# Resume Point

The next action is:

> **Step 3: Create the Next.js frontend.**

Do not create the FastAPI backend until the Next.js scaffold has been started, linted, built, and committed.
