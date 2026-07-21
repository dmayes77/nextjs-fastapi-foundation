Architecture

Overview

This repository contains two independent applications inside one Git repository:

- frontend/ contains the Next.js application.
- backend/ contains the FastAPI application.

Each application manages its own dependencies and can run independently.

The implementation order is intentionally backend-first:

Backend foundation
↓
Frontend foundation
↓
Application integration
↓
Vertical slice

This structure works like a duplex:

- The frontend and backend are separate living spaces.
- The Git repository is the shared building.
- Root scripts provide one convenient way to run both applications.
- HTTP requests connect the two applications.

Request Flow

The basic application flow is:

Browser
→ Next.js
→ FastAPI
→ SQLAlchemy
→ PostgreSQL

Each layer has a specific responsibility. The frontend handles presentation, the backend handles application logic, and PostgreSQL stores persistent data.

Frontend Responsibilities

Next.js handles:

- Pages and layouts
- User interface components
- Server rendering
- Browser interactions
- Forms and Server Actions
- Frontend validation
- Requests to FastAPI
- Loading states
- Empty states
- Displaying API errors

Next.js does not connect directly to PostgreSQL.

Backend Responsibilities

FastAPI handles:

- API routes
- Request validation
- Response validation
- Business rules
- Database transactions
- SQLAlchemy queries
- Consistent error responses
- Request identifiers
- Health checks
- Readiness checks
- OpenAPI documentation

FastAPI is the main application API.

Database Responsibilities

PostgreSQL is the default database.

SQLAlchemy handles:

- Database models
- Queries
- Sessions
- Relationships
- Transactions

Alembic handles:

- Creating migrations
- Applying migrations
- Reversing migrations
- Tracking schema history

The application must not use Base.metadata.create_all() as a replacement for Alembic migrations.

Frontend and Backend Communication

The frontend communicates with FastAPI in two different ways.

Browser Requests

Requests made inside Client Components use the Next.js rewrite:

Browser
→ /api/v1/\*
→ Next.js rewrite
→ FastAPI

The browser sees a request to the same origin as the Next.js application. This prevents unnecessary CORS problems during local development.

Example:

fetch("/api/v1/projects")

Server Requests

Server Components, Server Actions, and server-side utilities call FastAPI directly:

Next.js server
→ FASTAPI_INTERNAL_URL
→ FastAPI

Example:

fetch(`${process.env.FASTAPI_INTERNAL_URL}/api/v1/projects`)

Server-side requests should not travel through the browser rewrite because both applications can communicate directly.

API Versioning

All application API routes use the /api/v1 prefix.

Examples:

GET /api/v1/projects
GET /api/v1/projects/{project_id}
POST /api/v1/projects
PATCH /api/v1/projects/{project_id}
POST /api/v1/projects/{project_id}/archive

Using a versioned prefix allows future API changes without immediately breaking existing consumers.

Backend Code Flow

Backend requests follow this direction:

Route
→ Service
→ SQLAlchemy session
→ PostgreSQL

Routes

Routes handle HTTP-specific responsibilities:

- Reading path and query parameters
- Accepting validated request bodies
- Calling services
- Returning response schemas
- Selecting HTTP status codes

Routes should remain small.

Services

Services handle:

- Business rules
- Application workflows
- Database operations
- Transaction boundaries
- Resource validation

Business logic should not be duplicated across route handlers.

Database Layer

The database layer handles:

- SQLAlchemy engine configuration
- Session creation
- Declarative metadata
- Table definitions
- Database-specific configuration

One database session is created for each request.

OpenAPI Contract

FastAPI generates an OpenAPI schema from routes and Pydantic models.

That schema is used to generate frontend API types and request functions:

FastAPI routes and schemas
→ OpenAPI document
→ Generated TypeScript client
→ Next.js features

Generated client files must not be edited manually.

When a backend request or response changes, the frontend client must be regenerated.

Environment Configuration

The applications manage environment settings separately.

The frontend uses variables such as:

FASTAPI_INTERNAL_URL=http://127.0.0.1:8000

The backend uses variables such as:

APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi
CORS_ORIGINS=http://localhost:3000

Real .env files must not be committed.

Every required environment variable must appear in the appropriate .env.example file.

Health and Readiness

FastAPI provides two operational endpoints.

Health

GET /health

This endpoint confirms that the FastAPI process is running.

It should not depend on PostgreSQL or another external service.

Readiness

GET /ready

This endpoint confirms that the application is ready to accept traffic.

It may verify:

- PostgreSQL connectivity
- Required application configuration
- Other required dependencies

A running application can be healthy but not ready.

Error Responses

FastAPI returns errors using one consistent structure:

{
"error": {
"code": "project_not_found",
"message": "Project not found",
"details": null,
"requestId": "request-id-value"
}
}

This allows Next.js to handle all backend errors consistently.

Testing Responsibilities

The project uses separate tools for different testing layers.

Backend

Pytest tests:

- Services
- API routes
- Validation
- Error handling
- Database behavior

Frontend

Jest and React Testing Library test:

- Utility functions
- Validation
- Interactive components
- Loading states
- Empty states
- Error states

End-to-End

Playwright tests:

- Browser behavior
- Next.js-to-FastAPI communication
- Database-backed workflows
- Complete user flows

Repository Principles

1. Keep the frontend and backend independently runnable.
2. Keep business logic out of route handlers.
3. Use SQLAlchemy for application database access.
4. Use Alembic for every database schema change.
5. Generate frontend API contracts from FastAPI OpenAPI.
6. Prefer simple folders over premature abstractions.
7. Add infrastructure only when a demonstrated requirement needs it.
8. Keep browser and server API requests separate.
9. Validate environment variables when applications start.
10. Use tests to protect communication between layers.
11. Never place secrets in frontend browser code.
12. Never hardcode environment-specific URLs inside feature code.

Version 1 Exclusions

The first version does not include:

- Authentication
- Supabase
- Docker
- Redis
- Background workers
- Payments
- Email
- Multi-tenancy
- GraphQL
- Turborepo
- Nx

These features can be added later after the core template is stable and fully tested.

## Foundation and Extensions

The stable core of this repository is:

```text
Next.js
  → FastAPI
  → SQLAlchemy
  → PostgreSQL
```

Optional capabilities connect around this core later. Examples:

```text
Authentication
Multi-tenancy
Billing
Storage
Realtime
Background jobs
```

These extensions should not change the core frontend-to-backend communication pattern described above.

The Project Management reference feature is not a required permanent domain. It exists to demonstrate the architecture end to end and may be removed or replaced.

## Architecture Decision Records

Long-lived architectural decisions, including the reasoning behind the technology choices described in this document, are recorded in `docs/adr/`.

See [Architecture Decision Records](./adr/README.md).
