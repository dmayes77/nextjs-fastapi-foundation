# ADR-0003: Use Async SQLAlchemy 2

## Status

Accepted

## Date

2026-07-19

## Context

FastAPI uses asynchronous request handling. The database layer needs:

- Explicit database sessions
- Modern query syntax
- Transaction support
- ORM and SQL expression support
- Compatibility with PostgreSQL

## Decision

The accepted implementation direction for the database layer is:

- SQLAlchemy 2
- The async engine
- `AsyncSession`
- `async_sessionmaker`
- SQLAlchemy 2-style `select()` statements
- One session per request

Use Psycopg 3 as the PostgreSQL driver.

## Consequences

### Positive

- Modern SQLAlchemy APIs
- Async-compatible database access
- Explicit session and transaction behavior
- Strong ORM and SQL capabilities
- Good PostgreSQL support

### Negative

- Async session handling requires discipline
- Lazy loading can create unexpected async behavior
- More complexity than a synchronous CRUD example
- Developers must understand transaction ownership

## Alternatives Considered

### Synchronous SQLAlchemy

Synchronous SQLAlchemy is simpler but does not align as well with the selected async FastAPI architecture.

### SQLModel

SQLModel reduces some duplication between Pydantic and SQLAlchemy models but provides less direct control over advanced SQLAlchemy behavior.

### Raw SQL

Raw SQL provides control but would require more manual mapping and infrastructure.
