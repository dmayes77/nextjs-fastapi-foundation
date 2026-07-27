Testing Standards

Purpose

These standards define how this project tests the frontend, backend, database, and full application flow.

The goal is to catch problems early without making the test suite harder to understand than the application itself.

Testing Layers

The project uses four testing layers:

1. Backend unit tests
2. Backend integration tests
3. Frontend unit and component tests
4. End-to-end tests

Each layer has a different purpose.

The testing order follows the implementation order. Backend tests are established with the backend foundation, frontend unit and component tests are established with the frontend foundation, and Playwright is added after the complete Project Management workflow exists.

Backend Unit Tests

Backend unit tests use Pytest.

They should test:

- Service behavior
- Validation rules
- Application exceptions
- Error mapping
- Utility functions
- Business rules

Unit tests should avoid real external services.

Use fakes, stubs, or dependency overrides when practical.

The default backend suite runs with `pnpm test:backend`, which explicitly passes `--ignore=tests/integration` to pytest. It uses pytest, pytest-asyncio, and `httpx.AsyncClient` over `httpx.ASGITransport` — never the synchronous FastAPI `TestClient`. Each test builds a fresh application from `create_app()` and gets its own async client, so middleware, exception handlers, and dependency overrides never leak between tests; an autouse fixture also clears the `get_settings()` cache before and after every test. This default suite must not require PostgreSQL, collect tests from `backend/tests/integration/`, or run Alembic migrations.

Database readiness is verified by monkeypatching `app.services.system.check_database` directly (it is a plain function call inside `check_readiness()`, not a FastAPI dependency, so `app.dependency_overrides` has no effect on it). Test-only routes needed to exercise error handling (unique paths such as `/__test__/...`) may be attached to the per-test application instance inside a test; they are never added to the production route table.

Backend Integration Tests

Backend integration tests verify that multiple backend layers work together.

They may test:

- FastAPI routes
- Pydantic validation
- SQLAlchemy queries
- PostgreSQL behavior
- Transaction boundaries
- Alembic-created schemas
- Standard error responses

Integration tests may use a real dedicated PostgreSQL test database.

They must never use the production database.

Real database and Alembic integration tests are a separate test category from the default backend suite established in Step 13. Run them explicitly with `pnpm test:backend:integration`, which selects `backend/tests/integration/` and requires a reachable, dedicated PostgreSQL database whose name contains `test` as a complete, case-insensitive underscore-delimited segment. Valid examples include `test`, `test_projects`, and `next_fastapi_test`; incidental matches such as `latest`, `contest`, and `productiontest` are rejected. Connection-target query parameters (`dbname`, `database`, `host`, `hostaddr`, `port`, `service`, and `servicefile`, matched case-insensitively) are forbidden because SQLAlchemy or Psycopg may use them instead of the authority or URL path; harmless options such as `sslmode`, `connect_timeout`, and `application_name` remain supported. The explicit command fails when the database is unreachable or its credentials are invalid; it must never skip the entire suite and report a false-green result. Direct pytest commands remain available for intentional custom selection, including full discovery; the canonical `pnpm test:backend` command is the safe PostgreSQL-free default.

Frontend Unit Tests

Frontend unit tests use Jest.

They should test:

- Utility functions
- API error normalization
- Environment helpers
- Validation logic
- Small formatting functions

Unit tests should remain fast and focused.

Frontend Component Tests

React Testing Library tests interactive components.

They should test behavior from the user’s perspective.

Examples:

- A form displays validation feedback.
- A button submits valid data.
- A loading state appears.
- An empty state appears.
- An API error is displayed safely.
- A Todo item changes after an interaction.

Avoid testing internal React implementation details.

End-to-End Tests

Playwright tests the complete application.

The primary flow is:

Browser
→ Next.js
→ FastAPI
→ SQLAlchemy
→ PostgreSQL
→ Response
→ Updated user interface

End-to-end tests should verify critical user workflows rather than every small visual detail.

Initial End-to-End Flow

The first full-flow test:

1. Open the Project Management page.
2. Confirm the dedicated database begins empty.
3. Create a Project.
4. Confirm the Project appears.
5. Update its name and description.
6. Confirm the new values appear.
7. Archive the Project.
8. Confirm the Project shows as archived and read-only.

Run it from the repository root with:

```bash
pnpm playwright:install
pnpm test:e2e
```

Only Chromium is installed and used in Step 25. The suite uses one worker, one
browser project, and one lifecycle test. It uses accessibility-first selectors
and does not rely on a page-object framework.

`PLAYWRIGHT_DATABASE_URL` selects the dedicated E2E target and defaults locally
to `next_fastapi_e2e_test`. The same authoritative PostgreSQL URL guard protects
both pytest integration infrastructure and Playwright setup/cleanup. It requires
an explicit database whose underscore-delimited name contains a complete `test`
segment and rejects malformed URLs, unsupported drivers, and the target-changing
query parameters documented below. Both `postgresql://` and
`postgresql+psycopg://` forms are accepted; the shared layer normalizes the plain
form to `postgresql+psycopg://` so every lifecycle operation uses the installed
Psycopg 3 driver.

Playwright validates the target before starting either server. Setup creates the
validated database only for PostgreSQL's specific missing-database response,
sets both runtime and migration URLs to that exact target, upgrades through
Alembic to head, and deletes all Project rows. Teardown validates the target
again and deletes all Project rows without dropping or downgrading the database.
The normal development database is never used.

Both web servers are new processes with existing-server reuse disabled. Failure
screenshots are retained, traces are retained on local failures (and on the first
retry in CI), and video is disabled. Step 25 adds the local workflow only; CI
wiring remains Step 27.

Test Naming

Test names should describe expected behavior.

Good backend names:

test_create_todo_returns_201
test_get_missing_todo_returns_404
test_invalid_title_returns_validation_error

Good frontend names:

displays_empty_state_when_no_todos_exist
submits_valid_todo_form
shows_api_error_message

Avoid names such as:

test_one
test_function
works_correctly

Arrange, Act, Assert

Tests should normally follow this structure:

1. Arrange the required data and dependencies.
2. Act by calling the function, endpoint, or UI interaction.
3. Assert the expected behavior.

Keep these sections visually clear.

Test Independence

Every test must be able to run independently.

Tests must not depend on:

- Execution order
- Data created by an earlier test
- Local developer database contents
- A manually running production service
- Another test leaving state behind

Database Isolation

Database tests must isolate state.

The project may use:

- Transaction rollback
- Table cleanup
- Dedicated schemas
- A temporary database

The chosen strategy must be documented and used consistently.

The test database name must contain `test` as a complete, case-insensitive
underscore-delimited segment.

Valid examples:

test
test_projects
next_fastapi_test

Incidental substring matches such as `latest`, `contest`, `attestation`,
and `productiontest` are not test database names and must be rejected.
The URL path is the only permitted source of the database name. Query
parameters named `dbname`, `database`, `host`, `hostaddr`, `port`, `service`, or
`servicefile` are forbidden, matched case-insensitively after URL decoding.

Environment Safety

Test configuration must make production database use difficult.

Recommended protections include:

- A separate test environment file
- A required test database name
- A startup assertion that detects unsafe database URLs
- Separate CI database credentials

Automated tests must stop when they detect a production-like database configuration.

Fixtures

Use fixtures for repeatable setup.

Examples:

- Fresh `create_app()` application and async test client (function-scoped)
- Database session
- Todo factory
- Environment settings
- Dependency overrides

Fixtures should remain small and focused.

Avoid a single fixture that silently creates the entire application state for every test.

Factories

Factories create valid test objects with sensible defaults.

Tests should override only the fields relevant to the behavior being tested.

Example concept:

create_todo_data(title="Write tests")

Factories should not hide important setup required to understand the test.

Mocking

Mock external boundaries, not internal implementation details.

Good mocking targets:

- Email provider
- Payment provider
- External HTTP API
- Object storage
- Time source when necessary

Avoid mocking every service method simply to make a route test pass.

Integration tests should exercise real internal layers when that is the purpose of the test.

Time

Tests involving time must use stable values.

Do not depend on the exact current second unless the test controls the clock.

Use timezone-aware UTC values.

Generated API Client

The generated OpenAPI client is build output.

Tests should verify:

- The generated client is current.
- Frontend code compiles against generated types.
- Backend contract changes require regeneration.

Do not write tests that manually duplicate every generated type.

Error Testing

Tests should verify the standard error structure.

Example assertions:

error.code
error.message
error.details
error.requestId

Do not assert private stack traces or database driver messages in public responses.

Status Code Testing

API route tests should verify expected status codes.

Examples:

200
201
204
404
409
422
503

For 204 No Content, verify that no response body is returned.

Validation Testing

Test both valid and invalid boundaries.

Examples:

- Minimum title length
- Maximum title length
- Invalid UUID
- Invalid pagination
- Missing required field
- Unsupported sort field

Boundary tests are often more valuable than repeating ordinary valid examples.

Coverage

Coverage is a guide, not the goal.

High coverage does not guarantee useful tests.

Prioritize:

- Business rules
- Error paths
- Database constraints
- API contracts
- Critical user workflows

Do not write meaningless assertions only to increase a percentage.

Snapshot Testing

Snapshot tests should be used sparingly.

Avoid large snapshots that are difficult to review.

Prefer direct assertions for important behavior.

Test Commands

The final root commands should include:

pnpm test
pnpm test:frontend
pnpm test:backend
pnpm test:backend:integration
pnpm test:e2e
pnpm check

The exact commands must be documented in the README after they are verified. `pnpm test:backend` is the PostgreSQL-free default and `pnpm test:backend:integration` explicitly runs the real-PostgreSQL Alembic suite; the remaining commands are added with their respective testing layers.

Local Test Workflow

Before committing a feature, run the smallest relevant test set.

Before opening a pull request, run the complete safe validation command.

Example future workflow:

pnpm check

Run end-to-end tests when the change affects:

- API communication
- Database behavior
- Forms
- Routing
- Full user flows

Continuous Integration

GitHub Actions should run:

- Frontend lint
- Frontend tests
- Frontend build
- Backend lint
- Backend formatting check
- Backend tests
- PostgreSQL integration tests
- Alembic upgrade
- OpenAPI client freshness check
- Playwright end-to-end tests

A pull request should not merge while required checks are failing.

Bug Fixes

Every bug fix should include a regression test when practical.

The test should fail before the fix and pass after the fix.

If a regression test is not practical, the pull request should explain why.

Flaky Tests

Do not accept flaky tests as normal.

When a test fails intermittently:

1. Identify the unstable dependency.
2. Remove timing assumptions.
3. Improve isolation.
4. Use explicit waits only where appropriate.
5. Do not solve the issue by adding arbitrary long delays.

Final Rule

Test behavior at the lowest layer that proves the requirement, then use end-to-end tests for the small number of workflows that must prove the entire system works together.
