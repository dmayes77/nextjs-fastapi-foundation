# Architecture Decision Records

## What is an ADR?

An Architecture Decision Record (ADR) is a short document that captures one significant architectural decision: the context that led to it, the decision itself, its consequences, and the alternatives that were considered.

## Why this repository uses ADRs

This repository combines several technologies whose selection is not obvious from the code alone. ADRs record why the project uses its current technologies and implementation approach, so future contributors can understand the reasoning without reconstructing it.

ADRs document important, long-lived decisions. Small implementation details do not need an ADR.

## Rules

- Accepted ADRs are historical records and should not be silently rewritten.
- When a decision changes, write a new ADR that supersedes the earlier one and update both statuses.
- Keep each ADR concise and focused on one decision.

## How to add a new ADR

1. Copy the structure of an existing ADR.
2. Use the next available four-digit number, for example `0008-short-decision-title.md`.
3. Fill in Status, Date, Context, Decision, Consequences, and Alternatives Considered.
4. Add the ADR to the index table below.

## Numbering convention

ADRs are numbered sequentially with four digits, starting at `0001`. Numbers are never reused, even if an ADR is superseded or rejected.

## Status values

```text
Proposed
Accepted
Deprecated
Superseded
Rejected
```

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](./0001-use-nextjs-and-fastapi.md) | Use Next.js and FastAPI | Accepted |
| [0002](./0002-use-postgresql.md) | Use PostgreSQL | Accepted |
| [0003](./0003-use-async-sqlalchemy-2.md) | Use Async SQLAlchemy 2 | Accepted |
| [0004](./0004-use-alembic-for-migrations.md) | Use Alembic for Migrations | Accepted |
| [0005](./0005-generate-frontend-client-from-openapi.md) | Generate the Frontend Client from OpenAPI | Accepted |
| [0006](./0006-use-server-components-by-default.md) | Use Server Components by Default | Accepted |
| [0007](./0007-build-backend-foundation-before-integration.md) | Build the Backend Foundation Before Integration | Accepted |
