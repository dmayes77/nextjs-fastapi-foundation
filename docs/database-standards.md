Database Standards

Purpose

These standards define how PostgreSQL, SQLAlchemy, and Alembic are used in this project.

The goal is to keep database changes safe, predictable, and easy to review.

Supported Database

PostgreSQL is the default and supported database for version 1.

The template does not promise compatibility with:

- MySQL
- MariaDB
- SQLite
- SQL Server
- Oracle

Another SQL database may be added later, but it should be treated as a separate compatibility effort rather than a simple connection-string change.

Database Access

FastAPI accesses PostgreSQL through SQLAlchemy 2.

PostgreSQL and async SQLAlchemy are added before frontend integration so the backend foundation is stable before the browser-facing layers are connected.

The application must not:

- Query PostgreSQL directly from Next.js
- Place SQL queries inside frontend code
- Create a database session inside every service manually
- Keep one shared global session
- Use Base.metadata.create_all() to manage production schemas

The standard request flow is:

FastAPI dependency
→ AsyncSession
→ Service
→ SQLAlchemy query
→ PostgreSQL

Async SQLAlchemy

The backend uses SQLAlchemy’s async API.

Required components include:

create_async_engine
async_sessionmaker
AsyncSession

Database operations use await.

Example:

result = await session.execute(
select(Todo).where(Todo.id == todo_id)
)

Do not use synchronous database drivers inside async request handlers.

PostgreSQL Driver

The default PostgreSQL driver is Psycopg 3.

The database URL uses:

postgresql+psycopg://

Example:

postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi

The same driver may support synchronous Alembic operations and asynchronous application operations through separate engine configuration.

Database URLs

The backend supports separate application and migration URLs when needed.

Default development configuration:

DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi

Optional migration configuration:

DATABASE_MIGRATION_URL=postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi

When DATABASE_MIGRATION_URL is not provided, Alembic falls back to DATABASE_URL. A second URL is not required for local development.

Environment-specific URLs must never be hardcoded in Python files.

Sessions

Create one SQLAlchemy session per request.

The database dependency should:

1. Open the session.
2. Yield the session to the request.
3. Roll back when an unhandled error occurs.
4. Close the session after the request.

Routes and services must not keep request sessions after the request ends.

Transactions

Transactions must have clear ownership.

For simple operations, a service may:

add
flush
commit
refresh

For multi-step workflows, use an explicit transaction boundary.

Example:

async with session.begin():
...

Do not commit halfway through a workflow that must succeed or fail as one unit.

Do not hide commits inside low-level helper functions when the calling service needs transaction control.

SQLAlchemy Models

SQLAlchemy table classes belong in:

backend/app/database/tables/

Each table should define:

- Table name
- Primary key
- Required columns
- Nullability
- Constraints
- Relationships
- Indexes where justified
- Created timestamp
- Updated timestamp where appropriate

Do not rely on implicit database behavior when an explicit constraint can protect the data.

Primary Keys

The reusable template uses PostgreSQL UUID primary keys.

Example concept:

id UUID PRIMARY KEY

UUID values should be generated consistently.

The project should choose one standard generation method and document it.

Application-generated UUIDs are acceptable when they simplify creation before a database flush.

Timestamps

Store timestamps as timezone-aware PostgreSQL timestamps.

Standard columns:

created_at
updated_at

Store values in UTC.

Do not store timestamps as formatted strings.

The API may expose them as:

createdAt
updatedAt

Naming Convention

Database identifiers use lowercase snake_case.

Examples:

todos
created_at
user_id
ix_todos_completed
uq_users_email

SQLAlchemy metadata must define a deterministic constraint naming convention.

Recommended pattern:

ix: ix*<column>
uq: uq*<table>_<column>
ck: ck_<table>_<constraint>
fk: fk_<table>_<column>_<referred*table>
pk: pk*<table>

Deterministic names make Alembic migrations easier to review and maintain.

Foreign Keys

Foreign keys must explicitly define expected deletion behavior.

Possible choices include:

- Restrict deletion
- Cascade deletion
- Set the foreign key to null

Do not use cascading deletion automatically without considering data loss.

Relationships should match the database constraint behavior.

Nullability

Every column must deliberately choose whether it allows null values.

Avoid nullable columns simply because the value might be added later.

Use a nullable column only when the absence of a value has a clear business meaning.

Defaults

Understand the difference between:

- Python-side defaults
- SQLAlchemy insert defaults
- PostgreSQL server defaults

Use PostgreSQL server defaults when the database should guarantee the value regardless of which application writes the row.

Migration files should accurately represent required server defaults.

Enums

PostgreSQL enums should be used carefully.

They provide strong constraints but require migrations when values change.

A string column with a check constraint may be simpler for values expected to evolve frequently.

The decision should be documented for each domain.

JSONB

Use PostgreSQL JSONB only for data that is genuinely flexible or document-shaped.

Do not use JSONB to avoid designing relational tables.

JSONB fields should have:

- A defined purpose
- Validation in application schemas
- Indexes only when query behavior justifies them

Indexes

Indexes should support actual query patterns.

Add indexes for:

- Frequently filtered columns
- Foreign keys when useful
- Common sort operations
- Unique business identifiers
- Composite lookup patterns

Do not add indexes to every column automatically.

Indexes improve reads but increase storage and write cost.

Unique Constraints

Use database unique constraints for values that must remain unique.

Examples:

email
slug
external_reference

Application checks alone cannot safely guarantee uniqueness under concurrent requests.

Services should catch and translate uniqueness violations into a standard 409 Conflict response when appropriate.

Queries

Use SQLAlchemy 2-style queries.

Example:

statement = select(Todo).where(Todo.id == todo_id)
result = await session.execute(statement)
todo = result.scalar_one_or_none()

Avoid building SQL strings from user input.

Sorting and filtering fields must be selected from an approved list.

Pagination

Collection queries must apply pagination at the database level.

Do not load every row and then slice the Python list.

Pagination queries should use:

limit
offset

A separate count query may be needed for pagination metadata.

Alembic

Alembic is the only supported schema migration system.

Alembic manages:

- Tables
- Columns
- Constraints
- Indexes
- PostgreSQL types
- Data migrations when reviewed
- Schema history

The application must not silently modify the schema at startup.

Migration Workflow

The standard migration process is:

1. Update SQLAlchemy metadata.
2. Generate a migration.
3. Review the migration manually.
4. Apply it to the development database.
5. Run tests.
6. Verify downgrade behavior when practical.
7. Commit the model and migration together.

Root commands:

pnpm db:revision -m "describe change"
pnpm db:upgrade
pnpm db:downgrade
pnpm db:current
pnpm db:history

db:revision always runs with --autogenerate; pass the message directly (no -- separator).

The baseline migration is intentionally empty and contains no domain schema. It exists only to establish migration history before the first domain table is added.

Migration Review

Autogenerated migrations are drafts, not guaranteed-correct results.

Review every migration for:

- Correct table and column names
- Nullability
- Server defaults
- Foreign keys
- Constraint names
- Indexes
- PostgreSQL-specific types
- Upgrade order
- Downgrade safety
- Unexpected destructive changes

Do not commit an autogenerated migration without reading it.

Destructive Migrations

Changes that may destroy data require special care.

Examples:

- Dropping a table
- Dropping a column
- Changing a column to a smaller type
- Making a nullable column required
- Rewriting enum values

Use staged migrations when needed.

Example:

1. Add a new nullable column.
2. Backfill existing rows.
3. Update application code.
4. Make the column required in a later migration.
5. Remove the old column after verification.

Data Migrations

Small, deterministic data updates may be included in Alembic.

Large or operationally risky data migrations should use a separate reviewed script or deployment process.

Migration code must not depend on changing application service code.

Seeds

Seed data is for local development and tests.

Seed scripts must be:

- Safe to rerun when practical
- Clearly separated from migrations
- Free of production secrets
- Small enough to understand

Production data should not be created automatically from development seed files.

Testing Databases

Automated tests must not use the production database.

Use a dedicated test database.

Test configuration should make accidental production access difficult.

Database tests should isolate state through one or more of these techniques:

- Transaction rollback
- Database cleanup
- Dedicated schemas
- Temporary databases

The selected method must produce repeatable tests.

Connection Pooling

Use conservative development defaults.

Production pool settings should be environment-configurable.

Do not copy large connection-pool values without understanding:

- Application worker count
- PostgreSQL connection limits
- Deployment platform
- Pooler behavior

Readiness

The /ready endpoint should verify database connectivity using a lightweight query.

Example concept:

SELECT 1

It should not run migrations, inspect every table, or perform expensive queries.

Logging

Database logs must not expose:

- Connection passwords
- Complete connection URLs
- Sensitive query parameters
- Private user data

SQL query logging may be useful in development but should be controlled by configuration.

Backup and Restore

Production deployment documentation must explain that schema migrations do not replace backups.

Before risky migrations, teams should confirm:

- A recent backup exists
- Restore procedures are understood
- Migration rollback limitations are known

Final Rule

The database is responsible for protecting data integrity.

Application validation improves behavior, but important guarantees such as uniqueness, foreign keys, nullability, and valid relationships should also be enforced by PostgreSQL.
