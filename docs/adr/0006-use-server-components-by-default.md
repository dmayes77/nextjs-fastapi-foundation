# ADR-0006: Use Server Components by Default

## Status

Accepted

## Date

2026-07-19

## Context

Next.js App Router supports Server Components and Client Components.

The project needs to control:

- JavaScript sent to the browser
- Data access location
- Client boundaries
- Interactive behavior

## Decision

Use Server Components by default.

Add `"use client"` only when a component needs:

- React state
- React effects
- Browser events
- Browser-only APIs
- Client-side subscriptions

Client boundaries should remain small.

## Consequences

### Positive

- Less browser JavaScript
- Server-side data access
- Clear client boundaries
- Better protection of server-only values
- Natural use of App Router features

### Negative

- Developers must understand server and client boundaries
- Some testing strategies differ between the two component types
- Interactive features require deliberate Client Components
- Serialization rules limit data passed to Client Components

## Alternatives Considered

### Client Components by default

Defaulting to Client Components is familiar to traditional React developers but increases browser JavaScript and weakens server-first boundaries.

### Client-only React application

A client-only React application would not use the selected App Router rendering model.
