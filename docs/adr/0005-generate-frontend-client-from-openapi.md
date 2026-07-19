# ADR-0005: Generate the Frontend Client from OpenAPI

## Status

Accepted

## Date

2026-07-19

## Context

Next.js and FastAPI use different languages and cannot safely share source types directly.

The project needs to prevent:

- Duplicated request types
- Duplicated response types
- Stale frontend contracts
- Undocumented endpoint changes

## Decision

Use FastAPI OpenAPI output as the source for generating the frontend API client.

- Pydantic and FastAPI define the backend contract.
- OpenAPI is exported deterministically.
- TypeScript types and request functions are generated from the OpenAPI document.
- Generated files are not edited manually.
- CI will later verify that the generated client is fresh.

This is the accepted direction for frontend and backend integration; the generation tooling is set up when the applications are integrated.

## Consequences

### Positive

- Compiler-checked frontend contracts
- Less manual duplication
- Faster detection of breaking API changes
- Better API discoverability
- One source of truth for the API contract

### Negative

- Generated files add build tooling
- Backend contract changes require regeneration
- Generator updates may change generated output
- Generated code may require thin application wrappers

## Alternatives Considered

### Handwritten TypeScript interfaces

Handwritten interfaces are simple initially but drift from backend schemas over time.

### Shared source package

Python and TypeScript cannot directly share runtime source models.

### GraphQL

GraphQL provides a typed contract but introduces a different API architecture beyond the project requirements.
