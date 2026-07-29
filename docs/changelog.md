# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added Step 29 template preparation: an MIT repository license, private
  vulnerability-reporting policy, structured bug and feature issue forms, a
  concise pull request template, and weekly Dependabot coverage for root and
  frontend pnpm dependencies, backend uv dependencies, and GitHub Actions.
- Completed Step 29 after a private repository generated through **Use this
  template** passed local and hosted validation:
  - Local:
    - 152 frontend tests across 14 suites
    - 196 backend tests
    - 11 PostgreSQL integration tests
    - 1 Playwright E2E test
    - production frontend build passed
    - OpenAPI and generated frontend API freshness passed
  - Hosted:
    - Full-stack CI run `30404101906`
    - `Quality, PostgreSQL, and Playwright`
    - conclusion: success
  - The disposable validation PR #12 was closed without merge, and the
    temporary repository was used only for template verification.
- Added the Next.js App Router frontend foundation with TypeScript, Tailwind CSS, and ESLint (`fe47ff7`).
- Added the FastAPI backend foundation, served with `uv` and exposing OpenAPI documentation (`560829b`).
- Added backend environment configuration using Pydantic Settings, validated at startup and loaded from `.env` with a committed `.env.example` (`a55a9e2`).
- Added structured request logging and request-scoped `X-Request-ID` handling, including start and completion logs with duration and the request ID echoed in every response (`7dbcc4d`).
- Added production-style `GET /health` and `GET /ready` endpoints for application liveness and readiness monitoring, with database readiness deferred until the database layer exists.
- Added centralized application, HTTP, validation, and unexpected-exception handling with a consistent request-ID-aware error envelope.
- Added a domain-neutral async PostgreSQL and SQLAlchemy 2 foundation: a single async engine and session factory, a deterministic constraint naming convention, one database session per request via dependency injection, and a `/ready` database connectivity check that returns `503` through the standard error envelope when the database is unreachable.
- Added an async Alembic migration foundation with shared SQLAlchemy metadata, environment-driven migration URLs, root migration commands, and an infrastructure-only baseline revision.
- Added an isolated async backend test foundation covering operational routes, request IDs, readiness failures, and the standard error envelope without requiring PostgreSQL.
- Added the frontend environment contract (`APP_ORIGIN`, `FASTAPI_INTERNAL_URL`) with a server-only validation layer that fails immediately with a clear message on missing or invalid values, keeping application code identical across local development, CI, and production.
- Added a reusable browser and server API client foundation (`frontend/lib/api/`) with a shared request layer that normalizes every failure into `APIError`, `NetworkError`, or `TimeoutError`, applies a fixed internal timeout, and safely parses JSON responses; the server client is server-only and the browser client uses relative same-origin paths only.
- Added a frontend error-normalization layer (`frontend/lib/errors/`) that converts every transport or runtime error into one `AppError` shape (`code`, `message`, `status`, `details`, `requestId`, `retryable`), preserving the backend's request ID and error envelope when available so feature code never inspects transport error types directly.
- Added a frontend test foundation using Jest and React Testing Library, configured through Next.js's `next/jest` integration (`frontend/jest.config.ts`, `frontend/jest.setup.ts`) with a `@/*` path alias mapping and shared `@testing-library/jest-dom` setup, plus initial utility-layer tests covering the API client's error classes and the error-normalization layer (`frontend/tests/api/`, `frontend/tests/errors/`).
- Added the first working Next.js-to-FastAPI integration: a same-origin `GET /api/backend/health` route handler (`frontend/app/api/backend/health/route.ts`) that calls FastAPI's `/health` through the existing server API client, forwards a validated incoming `X-Request-ID` or generates one, maps network and timeout failures to `503` and unexpected failures to `500`, and normalizes failures into the same error envelope FastAPI itself returns; a `BackendStatus` Client Component (`frontend/components/backend-status.tsx`) calls this route through the existing browser API client and renders a loading, connected, or safe unavailable state with manual retry and refresh; both are covered by new route-handler and component tests (`frontend/tests/integration/`, `frontend/tests/components/`).
- Added a deterministic OpenAPI export (`backend/scripts/export_openapi.py`) that builds the schema from a fresh application instance and serializes it with sorted keys, fixed indentation, and a trailing newline so the output is byte-identical across machines and repeated runs; the committed contract lives at `backend/openapi.json`, regenerated with `pnpm openapi:export` and verified against drift with `pnpm openapi:check`. Every route now sets an explicit, function-name-independent `operation_id` (`root_get`, `health_get`, `ready_get`), backed by a deterministic fallback `generate_unique_id_function` for any future route that omits one.
- Added repository-wide agent guidance (`AGENTS.md`, deferring to more specific nested files such as `frontend/AGENTS.md`) together with GitHub Copilot repository instructions (`.github/copilot-instructions.md` and path-specific files under `.github/instructions/`), and documented the distinction between the two in `docs/architecture.md` (`05b7cca`, `77d338a`).
- Added a generated, committed frontend API contract: `pnpm api:generate` runs `openapi-typescript` against `backend/openapi.json` to produce type-only TypeScript (`frontend/lib/api/generated/schema.ts`, never hand-edited, no runtime of its own) and a second generator (`frontend/scripts/generate-api-operations.mjs`) to produce one typed, callable operation function per OpenAPI operation (`frontend/lib/api/generated/operations.ts`, e.g. `healthGet`) that encodes each operation's path, HTTP method, and response type while delegating request execution to an injected transport compatible with the existing `apiRequest` — without requiring FastAPI to be running; `frontend/lib/api/contracts.ts` re-exports the currently-used types and operation functions (e.g. `HealthResponse`, `healthGet`) that the existing health integration now calls instead of writing the FastAPI endpoint path by hand, so the generated contract supplements the handwritten `lib/api/client.ts`/`server.ts` transport and `normalizeError()` rather than replacing them.
- Added `pnpm api:check`, a deterministic freshness check for the generated frontend API contract: it runs `pnpm openapi:check`, then regenerates `schema.ts` and `operations.ts` into a temporary directory using the same generation pipeline as `pnpm api:generate` and compares each byte-for-byte against the committed files in `frontend/lib/api/generated/`, failing with the specific stale, missing, or unexpectedly extra file rather than silently regenerating or overwriting anything (`frontend/scripts/check-generated-api.mjs`).
- Added the first domain table, `Project` (`backend/app/database/tables/project.py`), and its Alembic migration: an application-generated UUID4 primary key, a required `name`, a nullable `description`, a bounded `status` string defaulting to `planned` with a named `CHECK` constraint (`ck_projects_status_allowed`) restricting it to `planned`/`active`/`completed`/`archived` rather than a PostgreSQL enum, a nullable `due_date`, and timezone-aware `created_at`/`updated_at` timestamps — `updated_at` is refreshed by SQLAlchemy's `onupdate` for application writes only, not by a database trigger. Every table now registers through a deliberate registry (`backend/app/database/tables/__init__.py`) that `backend/migrations/env.py` imports directly, so Alembic never depends on the application having imported a table indirectly. Covered by column/constraint metadata tests requiring no database connection and, separately, real-PostgreSQL integration tests (`backend/tests/integration/`) verifying the migration's upgrade, downgrade, re-upgrade, and autogeneration parity against a dedicated `next_fastapi_test` database.
- Added the Project API vertical slice under `/api/v1/projects`: explicit camelCase Pydantic contracts, async repository persistence, service-owned transaction and lifecycle rules, thin list/retrieve/create/partial-update/archive routes, standard 404/409/422 errors, focused isolated tests, real-PostgreSQL repository coverage, and regenerated OpenAPI and frontend API artifacts for the initial five operations. Mutation reads use PostgreSQL row locks through the repository so concurrent update/archive lifecycle checks serialize through commit; mutation responses are refreshed and captured before commit, which remains the final database operation; generated create/update helpers require schema-derived request bodies that are forwarded through the existing transport; and server-defaulted request properties remain optional in generated TypeScript.
- Added the Step 24 Project Management frontend: a responsive Shadcn Admin-inspired App Router shell with minimal Overview and Projects navigation, server-rendered initial Project loading, generated-client create/edit/archive mutations, accessible dialogs and mobile navigation, loading/empty/normalized-error states, archived read-only presentation, and focused Jest coverage. The visual system was adopted selectively without importing the reference template's Vite, TanStack, Clerk, Axios, mock-data, or state-management architecture.
- Added a dedicated `POST /api/v1/projects/{project_id}/restore` lifecycle action for demo recovery. It serializes through the existing mutation row lock, restores only archived Projects to `planned`, returns `409 Conflict` for non-archived Projects, leaves archived records readable, and updates the deterministic OpenAPI and generated frontend contracts without changing the database schema.
- Added the first Playwright browser-to-PostgreSQL lifecycle test for Project Management. A shared fail-closed PostgreSQL test-target guard now protects both pytest integration infrastructure and Playwright setup/cleanup; the E2E helper safely creates only a specifically missing dedicated database, upgrades it through Alembic, clears Project rows before and after the test, and never drops or downgrades it. The Chromium-only, one-worker test starts fresh backend and frontend servers, then verifies the empty, create, update, archive, and read-only states through accessible UI contracts. Local failure screenshots and traces are retained.
- Added one full-stack GitHub Actions workflow for every pull request and push to
  `main`. It caches pnpm and uv dependencies, runs the canonical safe `pnpm check`,
  verifies Alembic against a dedicated PostgreSQL service database, runs the
  explicit integration suite, installs managed Chromium dependencies, and runs
  the existing Playwright workflow against a separately named E2E database.

### Changed

- Reworked onboarding around GitHub's template flow, documented which identity
  values and reference features are optional to customize, distinguished
  foundation contributors from template users, and pinned every external
  GitHub Action to its verified immutable release commit.
- Hardened the live public repository with accurate description and topics,
  automatic merged-branch deletion, private vulnerability reporting, and an
  active default-branch ruleset requiring pull requests, the full-stack CI
  check, and resolved review conversations while blocking force-pushes and
  branch deletion.
- Reorganized the FastAPI backend into an `app/` package with a dedicated routes layer and a `pyproject.toml` entrypoint (`d00046a`).
- Replaced the generated Next.js starter markup with the formatted project landing page (`13a16b7`).
- **Audit Cleanup B: Consistency, E2E Efficiency, and Documentation Alignment.** Made Project list ordering canonical and deterministic: the backend now returns Projects by `created_at` descending, then `id` descending. The frontend prepends newly created Projects for immediate feedback and adopts the server's canonical order during reconciliation, including UUID tie-breaking when timestamps are equal. Removed the duplicate E2E database preparation: `pnpm test:e2e` is now the sole preparation owner (creates, migrates, and clears the dedicated database once before Playwright starts); Playwright's own `global-setup.ts` — which ran the same preparation a second time — was deleted, and its configuration now only re-validates the target as a cheap safety guard. Removed the unused `CORS_ORIGINS` backend setting, since FastAPI never installed CORS middleware and the same-origin Next.js proxy architecture is unchanged. Corrected stale documentation: `backend/README.md` now documents the safe default test command instead of unrestricted `pytest` discovery, `frontend/README.md` no longer describes already-implemented features (the same-origin rewrite, Playwright E2E coverage) as future work, and `docs/testing-standards.md` now links to the root README's platform-specific Playwright install commands instead of repeating an incomplete, Linux-inaccurate copy.

### Security

- **Audit Cleanup A: Dependency and Runtime Safety.** Patched known high-severity JavaScript dependency advisories: `next` (16.2.10 → 16.2.11) and matching `eslint-config-next`, `concurrently` (^10.0.3 → ^10.0.4, removing vulnerable `shell-quote`). Added narrowly scoped `frontend/pnpm-workspace.yaml` overrides for transitive advisories whose direct parent had no compatible patched release available: `postcss`, `sharp` (native binary verified locally; Linux CI verification pending), and `js-yaml`, each scoped to the exact vulnerable resolution requested by its parent, plus `brace-expansion@^5.0.5` (its only compatible consumer, `minimatch@10.2.5`). **The frontend dependency graph still has known high-severity residual findings, all development-tooling-only.** GHSA-mh99-v99m-4gvg (`brace-expansion`) remains through three paths — `eslint`'s bundled `minimatch@3.1.5`, `openapi-typescript`'s `minimatch@5.1.9`, and `jest`'s `minimatch@9.0.9` — because the only patched `brace-expansion` release (5.0.8+) changed its CommonJS export shape and reproducibly breaks brace-pattern matching (`expand is not a function`) on all three older `minimatch` majors, and no compatible patched maintenance release exists for any of them; see `frontend/tests/dependency-overrides.test.ts` for the regression coverage guarding this. These paths are exercised only by developer-authored lint/build-tooling glob patterns, never application runtime or network input.
- Disposed the application's async SQLAlchemy engine pool on FastAPI shutdown via a new `lifespan` context in `backend/app/main.py`, replacing implicit reliance on process termination or garbage collection to close pooled connections. Request-scoped session commit/rollback/close behavior is unchanged.
- Replaced the deprecated `status.HTTP_422_UNPROCESSABLE_ENTITY` Starlette constant with `status.HTTP_422_UNPROCESSABLE_CONTENT` in the validation error handler; the numeric response remains `422` and the validation error envelope is unchanged. Eliminates four Starlette deprecation warnings previously reported by the backend test suite.

### Fixed

- Restored the local Homebrew PostgreSQL 17 service by safely removing a proven-stale `postmaster.pid` without reinitializing the existing cluster, documented the user-level startup and recovery workflow, and centralized safe `503 database_unavailable` responses for SQLAlchemy operational and pool-acquisition failures while preserving unexpected exceptions as `500`.
- Isolated the default CORS origins list so `Settings` instances do not share mutable state (`839b61c`).
- Fixed Next.js Turbopack workspace-root detection for the duplex repository layout.
- Hardened real-PostgreSQL integration migrations: Alembic receives the validated test URL through both database environment variables, prior values are restored after success or failure, session setup resets any preexisting migration state before establishing the baseline revision, destructive commands require `test` as a complete underscore-delimited database-name segment, database-target query overrides are forbidden, and rejected URLs never expose credentials.
- Separated the canonical PostgreSQL-free backend test command from the real-PostgreSQL Alembic suite: `pnpm test:backend` excludes `backend/tests/integration/`, while `pnpm test:backend:integration` runs that suite explicitly and fails rather than reports false-green skips when its database is unreachable.
- Aligned Backend CI with the canonical PostgreSQL-free pytest selection so the default Actions job cannot discover or execute the real-PostgreSQL integration suite.

### Documentation

- Replaced the partial root README with a complete first-time setup and
  operating guide covering architecture, verified installation, environment
  contracts, PostgreSQL and Alembic, generated API clients, quality commands,
  test isolation, full-stack CI, the Project reference slice, deployment and
  security considerations, troubleshooting, and safe template customization.
- Defined the project development standards covering architecture, coding, API, database, testing, and contribution rules (`7d6668d`).
- Added the project philosophy and updated the implementation roadmap (`9b344b5`).
- Revised the implementation roadmap to match the current build sequence (`6b6f1ab`).
- Added Architecture Decision Records under `docs/adr/` covering the core technology and sequencing decisions (`067231c`).
- Replaced the planned Todo example with a Project Management reference application while keeping the database foundation domain-neutral.
- Clarified that the repository is a complete full-stack foundation with optional authentication, multi-tenancy, billing, storage, and other product-specific extensions.

### Developer Experience

- Added root development commands that start the frontend and backend together with clearly labeled logs (`ae5bc4a`).
- Added repository-wide `lint`, `format`, `format:check`, `test`, `build`, and
  canonical safe `check` commands. Backend quality checks use Ruff with Python
  3.13 targeting, import sorting, production-oriented lint rules, formatting,
  and a formatter-only exclusion for Alembic revision files; PostgreSQL
  integration and Playwright remain explicit workflows.
- Adopted pnpm for frontend and root package management (`fe47ff7`).
- Included agent guidance files (`frontend/CLAUDE.md`, `frontend/AGENTS.md`) for AI-assisted development (`fe47ff7`).
- Verified that the applications start independently and through the combined root command (`ae5bc4a`).

<!--
When a release is created:

## [0.1.0] - YYYY-MM-DD

Move the appropriate entries from [Unreleased] into the new version section.
Leave [Unreleased] at the top for future changes.
-->
