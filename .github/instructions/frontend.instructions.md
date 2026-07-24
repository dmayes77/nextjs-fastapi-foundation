---
applyTo: "frontend/**/*.{js,jsx,ts,tsx}"
---

# Frontend Instructions

- Preserve Next.js App Router server and client boundaries.
- Files importing server environment configuration must remain server-only.
- Never import server-only modules into Client Components.
- Browser requests must use `frontend/lib/api/client.ts`.
- Server-side requests must use `frontend/lib/api/server.ts`.
- Do not call `fetch()` directly when the shared API layer covers the use case.
- Browser API paths must remain same-origin and must not include caller-supplied origins.
- Server API paths must resolve only against the configured FastAPI internal origin.
- Normalize transport failures through `normalizeError()` before presenting them to feature code.
- Do not render raw `AppError.details` to users.
- Public route handlers must sanitize arbitrary upstream response bodies.
- Preserve request-ID forwarding and correlation.
- Do not expose `FASTAPI_INTERNAL_URL`, server environment values, secrets, or internal URLs to client bundles.
- Prefer safe loading, success, and error states.
- Do not add automatic retries unless the active roadmap step explicitly requires them.
- Add deterministic Jest tests for shared utilities, route handlers, and components.
- Mock at the module boundary used by the subject under test.
- Avoid network calls in unit tests.
- Run:
  - `pnpm --dir frontend lint`
  - `pnpm --dir frontend exec tsc --noEmit`
  - `pnpm --dir frontend test`
  - a production build with valid environment values
