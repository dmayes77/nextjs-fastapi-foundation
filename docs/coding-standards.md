Coding Standards

Purpose

These standards keep the frontend and backend consistent, readable, and easy to maintain.

The goal is not to create unnecessary rules. The goal is to make common decisions once so every feature does not invent its own style.

General Rules

1. Prefer clear names over clever names.
2. Keep functions focused on one responsibility.
3. Avoid duplicate logic.
4. Remove unused code.
5. Do not commit commented-out code.
6. Do not hide errors without logging or handling them.
7. Keep configuration outside feature logic.
8. Write code for the next developer to understand.
9. Add abstractions only after repeated patterns are proven.
10. Keep files small enough to understand without excessive scrolling.

Naming

Use descriptive names.

Good:

get_todo_by_id
create_database_session
FASTAPI_INTERNAL_URL
TodoCreateRequest

Avoid:

get_data
handle_thing
temp
obj
info

File and Folder Naming

Frontend

Use lowercase kebab-case for general files and folders:

todo-form.tsx
api-errors.ts
server-client.ts
todo-list/

Use PascalCase only for exported React component names:

export function TodoForm() {}

Backend

Use lowercase snake_case:

todo_service.py
database_session.py
request_context.py

Use PascalCase for classes:

class TodoService:
...

Frontend Standards

Components

Use Server Components by default.

Add "use client" only when a component needs:

- Browser events
- React state
- React effects
- Browser-only APIs
- Client-side subscriptions

Keep client boundaries as small as possible.

Imports

Use the @/ alias for application imports.

Good:

import { TodoForm } from "@/features/todos/todo-form";

Avoid long relative imports:

import { TodoForm } from "../../../features/todos/todo-form";

Group imports in this order:

1. Framework and external packages
2. Application aliases
3. Relative imports
4. Styles

Forms

Use Server Actions for mutations initiated by Next.js forms when appropriate.

Use browser requests when the interaction requires:

- Upload progress
- Streaming
- Realtime feedback
- Browser-only APIs

Validation

Validate user input on both sides:

- Frontend validation improves user experience.
- Backend validation protects the application.

Frontend validation never replaces backend validation.

Environment Variables

Browser-safe variables must begin with:

NEXT*PUBLIC*

Server-only values must not begin with NEXT*PUBLIC*.

Do not read environment variables directly throughout feature code. Centralize environment access in a validation module.

API Calls

Browser code uses the same-origin API path:

/api/v1/...

Server code uses:

FASTAPI_INTERNAL_URL

Do not hardcode localhost inside feature files.

TypeScript

Avoid any.

Prefer:

- Generated OpenAPI types
- Explicit return types for shared functions
- Narrow unions
- Type guards
- unknown for untrusted values

Generated API files must not be edited manually.

Backend Standards

Async

FastAPI route handlers and database operations use async def.

Do not mark a function async unless it awaits asynchronous work.

Do not call blocking database or network operations directly inside async routes.

Routes

Routes should:

- Accept validated input
- Call a service
- Return a response
- Select an HTTP status

Routes should not contain large queries or complex business rules.

Services

Services should:

- Apply business rules
- Coordinate database work
- Raise application-specific exceptions
- Control transaction boundaries where needed

Database Sessions

Use one SQLAlchemy session per request.

Do not create shared global sessions.

Do not close a session manually inside route handlers.

Do not use Base.metadata.create_all() in application startup.

SQLAlchemy

Use SQLAlchemy 2-style queries.

Prefer:

select(Todo).where(Todo.id == todo_id)

Avoid legacy query style where possible.

Keep table definitions inside the database layer.

Pydantic

Use separate schemas when responsibilities differ:

TodoCreate
TodoUpdate
TodoResponse

Do not expose SQLAlchemy table objects directly as undocumented API responses.

Exceptions

Raise application-specific exceptions from services.

Translate them into HTTP responses in one centralized error layer.

Do not repeat identical HTTPException blocks across every route.

Logging

Use structured logs.

Include the request ID when available.

Never log:

- Passwords
- Tokens
- Cookies
- Database credentials
- Private personal data without a justified need

Formatting and Linting

Frontend

Use:

- ESLint
- Prettier if added to the project
- Next.js build checks

Backend

Use:

- Ruff for linting
- Ruff for formatting
- Pytest for tests

Formatting must be automated rather than debated manually.

Comments

Use comments to explain why, not what.

Good:

# Keep migrations separate from application startup so every

# deployment applies schema changes in a controlled step.

Avoid:

# Create engine

engine = create_async_engine(...)

Functions

Prefer short functions with clear inputs and outputs.

A function should not:

- Read environment variables
- Perform a database query
- Format an HTTP response
- Send an email

all at once.

Split responsibilities when a function becomes difficult to test independently.

Error Messages

User-facing messages should be clear and safe.

Good:

Todo not found

Avoid exposing internal details:

psycopg.errors.UndefinedTable: relation "todos" does not exist

Detailed errors belong in secure application logs.

Dates and Times

Store timestamps in UTC.

Use timezone-aware datetime values.

Convert to a local timezone only for display.

Do not store formatted date strings when a timestamp type is appropriate.

Identifiers

Use PostgreSQL UUIDs for primary identifiers in the reusable template unless a feature has a clear reason to use another type.

Do not expose sequential IDs when public identifiers need to be difficult to guess.

Tests

Every bug fix should include a test when practical.

Tests should describe behavior, not implementation details.

Good:

test_create_todo_returns_201

Avoid:

test_function_works

Git Commits

Use focused commits.

Recommended format:

type(scope): description

Examples:

feat(api): add health route
feat(database): add Todo table
fix(frontend): handle empty Todo response
test(api): cover Todo validation
docs: explain local setup
chore: update development scripts

Do not combine unrelated changes in one commit.

Changelog

Every meaningful project change must be represented under the `[Unreleased]` section of `docs/changelog.md`.

This applies to:

- Features
- Fixes
- Architecture changes
- Developer tooling
- Important documentation changes
- Security changes

It does not normally apply to:

- Typo corrections
- Formatting-only edits
- Generated file refreshes with no contract change
- Temporary investigative work

A feature implemented over several commits may share one consolidated changelog entry.

Pull Requests

A pull request should include:

- What changed
- Why it changed
- How it was tested
- Known risks
- Screenshots for visible UI changes when useful

The branch must pass all required checks before merge.

Final Rule

Choose the simplest implementation that is clear, tested, and appropriate for the current requirement.

Do not add complexity only because the project might need it someday.
