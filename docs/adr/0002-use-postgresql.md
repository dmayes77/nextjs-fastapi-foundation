# ADR-0002: Use PostgreSQL

## Status

Accepted

## Date

2026-07-19

## Context

The template needs a production relational database with:

- Transactions
- Constraints
- Relationships
- Indexes
- UUID support
- JSON support
- Mature hosting options
- Strong SQLAlchemy compatibility

## Decision

Use PostgreSQL as the supported database for version 1.

The template does not promise compatibility with every SQL database.

## Consequences

### Positive

- Mature relational features
- Strong integrity guarantees
- Reliable transaction support
- Good SQLAlchemy and Alembic support
- Broad managed hosting availability
- Native UUID and JSONB support

### Negative

- PostgreSQL-specific behavior may reduce portability
- Local development requires PostgreSQL
- Users who require MySQL or SQL Server need additional work

## Alternatives Considered

### SQLite

SQLite is useful for small local projects but does not sufficiently represent the production database behavior this template targets.

### MySQL or MariaDB

MySQL and MariaDB are capable databases, but supporting multiple engines would increase migration and testing complexity.

### Supabase as the core architecture

Supabase can host PostgreSQL, but making the core depend on Supabase would couple database, authentication, storage, and realtime concerns. Supabase is not part of the core architecture.
