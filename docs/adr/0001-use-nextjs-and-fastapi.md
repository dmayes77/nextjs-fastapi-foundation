# ADR-0001: Use Next.js and FastAPI

## Status

Accepted

## Date

2026-07-19

## Context

The project needs:

- A modern server-rendered React frontend
- A Python backend
- Clear frontend and backend ownership
- Independent development and deployment
- A documented HTTP contract between the applications

## Decision

Use:

- Next.js App Router for the frontend
- FastAPI for the backend
- HTTP as the boundary between them
- One Git repository containing both applications

The frontend and backend remain independently runnable. Each application manages its own dependencies and can be started on its own.

## Consequences

### Positive

- Strong frontend and backend specialization
- Clear separation of responsibilities
- Server rendering through Next.js
- Automatic OpenAPI generation through FastAPI
- Independent deployment options
- Familiar tools for TypeScript and Python developers

### Negative

- Two runtimes to install and operate
- Two dependency systems to maintain
- The HTTP contract between the applications must be coordinated
- More local development processes than a single-framework application

## Alternatives Considered

### Next.js only

A single Next.js application would simplify the runtime but would not provide the desired Python backend foundation.

### FastAPI with a client-only React frontend

Serving a client-only React application from FastAPI would lose the App Router and Server Component model.

### Separate repositories

Splitting the applications into separate repositories would increase coordination overhead for a tightly connected template.
