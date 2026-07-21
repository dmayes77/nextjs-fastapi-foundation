# Next.js FastAPI Foundation

A production-ready foundation for building full-stack applications with Next.js, FastAPI, PostgreSQL, SQLAlchemy, Alembic, and typed API communication.

The repository works as a complete starting point and includes a small Project Management reference feature to demonstrate the architecture from frontend to database. Developers can use the foundation as-is or extend it later with authentication, multi-tenancy, billing, storage, background jobs, and other product-specific capabilities.

The project is currently being built step by step. See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for the complete implementation roadmap.

See [docs/changelog.md](./docs/changelog.md) for unreleased changes and future release history.

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

## Backend Tests

```bash
pnpm test:backend
```

The default backend test suite is isolated and does not require a running PostgreSQL instance.

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
