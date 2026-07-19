# ADR-0007: Build the Backend Foundation Before Integration

## Status

Accepted

## Date

2026-07-19

## Context

The project contains two applications and could connect them immediately after scaffolding.

That approach risks integrating:

- Incomplete settings
- Incomplete error handling
- Incomplete logging
- Incomplete database infrastructure
- Unstable API contracts

## Decision

Use this implementation order:

```text
Backend foundation
    ↓
Frontend foundation
    ↓
Application integration
    ↓
First vertical slice
```

This is the development sequence, not the runtime request flow.

The runtime flow remains:

```text
Browser
    ↓
Next.js
    ↓
FastAPI
    ↓
SQLAlchemy
    ↓
PostgreSQL
```

## Consequences

### Positive

- Each application reaches a stable foundation before integration
- Fewer avoidable integration refactors
- Backend behavior can be tested independently
- Frontend API boundaries can be built against stable contracts
- Clear implementation checkpoints

### Negative

- The first complete user workflow appears later
- Early progress may feel infrastructure-heavy
- Some integration assumptions may still need adjustment later

## Alternatives Considered

### Connect immediately after scaffolding

Connecting immediately gives faster visual integration but couples two unfinished foundations.

### Build frontend first

Building the frontend first risks frontend assumptions being made before the API contract is stable.

### Build the complete backend before any frontend work

The frontend scaffold and project-level tooling are useful early, but detailed frontend integration should wait until the backend foundation is stable.
