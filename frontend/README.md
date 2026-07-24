# frontend

The Next.js App Router frontend for Next.js FastAPI Foundation.

## Quick Start

```bash
pnpm dev
```

Visit http://localhost:3000

## Environment

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Update the values as needed.
3. Required variables are validated when the application builds or starts — missing or invalid values fail immediately with a clear message.

### Environment Philosophy

Configuration belongs in environment variables, not code. The application should never need a code change to move between local development, CI, preview deployments, staging, or production — only the environment values change. Avoid branching on `NODE_ENV`, hardcoded `localhost` URLs, or hardcoded production domains anywhere in feature code.

### `APP_ORIGIN`

The canonical frontend origin.

- Local: `http://localhost:3000`
- Production: `https://example.com`

Used for server-generated absolute URLs: metadata, canonical URLs, password reset links, email links, OAuth callbacks, and other absolute redirects. It is **not** used for browser fetches, and it is **not** a security boundary — future authentication and callback validation will use explicit allow-lists and origin validation, not this value.

Must remain server-only.

### `FASTAPI_INTERNAL_URL`

The FastAPI origin used by Server Components and Server Actions for direct server-to-server requests.

- Local: `http://127.0.0.1:8000`
- Production: `https://api.example.com`

Server code calls FastAPI directly through this variable because server-to-server requests don't need to go through the browser. Browser code should eventually use the same-origin `/api/...` rewrite path instead, so the browser never needs to know the backend's real origin. This variable must remain server-only and must never be exposed through a `NEXT_PUBLIC_` variable — doing so would ship the backend's internal origin to every client.

### Production

Deployment platforms (Vercel, Railway, Render, Fly.io, etc.) provide the production values for `APP_ORIGIN` and `FASTAPI_INTERNAL_URL` directly. No application code changes are required to deploy — only the platform's environment configuration changes.

### Environment Layer

Environment access is centralized under `lib/env/`, never read directly (`process.env.X`) from feature code:

- `lib/env/server.ts` — validates `APP_ORIGIN` and `FASTAPI_INTERNAL_URL`, exports the typed `serverEnv`. Imports `server-only`, so importing this file from a Client Component fails the build.
- `lib/env/client.ts` — browser-safe variables only (`NEXT_PUBLIC_...`); nothing is required yet.
- `lib/env/shared.ts` — validation helpers with no secrets and no server-only logic, usable by both.

## API Requests

Feature code should call FastAPI through `lib/api/`, never with a raw `fetch()`:

- `lib/api/client.ts` — the browser client. `apiRequest(path, options)` takes a relative, same-origin path (e.g. `/api/example`) — the browser never talks to FastAPI directly, and this file never imports `server.ts` or references `FASTAPI_INTERNAL_URL`.
- `lib/api/server.ts` — the server client for Server Components and Server Actions. `apiRequest(path, options)` resolves `path` against `FASTAPI_INTERNAL_URL` and optionally forwards an `X-Request-ID` header. Imports `server-only`, so importing this file from a Client Component fails the build.
- `lib/api/shared.ts` — the request implementation both clients call. Every failure is normalized into `APIError` (preserves HTTP status, message, and the response body as `details`), `NetworkError`, or `TimeoutError` — callers never see a raw `fetch()` rejection. Requests use a fixed internal timeout and safely parse response bodies: empty and `204 No Content` responses become `null`, valid JSON is parsed, and non-empty text that is not valid JSON is preserved as-is rather than discarded.

Both clients validate `path` with a shared helper before making a request: it must begin with exactly one `/`, must not be protocol-relative (`//host/...`), and must not itself parse as an absolute URL. This means a caller can never supply their own origin — the browser client always stays same-origin, and the server client can never be redirected away from the configured `FASTAPI_INTERNAL_URL`.

These clients are the reusable transport foundation later features build on; generated contract types (below) supplement them without replacing them.

## Generated API Contract

`lib/api/generated/schema.ts` is generated from the backend's committed `backend/openapi.json` using [`openapi-typescript`](https://openapi-ts.dev/) — a types-only generator with no runtime of its own, so it can never bypass `lib/api/client.ts`, `lib/api/server.ts`, or `normalizeError()`.

```bash
pnpm api:generate
```

Regenerates `lib/api/generated/schema.ts` from `../backend/openapi.json`. FastAPI does not need to be running — generation reads the committed contract file, not a live server. The generated file starts with a header comment and must never be edited by hand; regenerate it instead.

`lib/api/contracts.ts` re-exports stable, named types (e.g. `HealthResponse`) from the generated schema, so feature code never imports the deeply nested generated shape directly. Feature code passes these types into the existing `apiRequest<T>()` calls — for example `apiRequest<HealthResponse>("/health")` — the generated types supplement the hand-written transport layer; they never replace it.

There is no automated check yet that fails when `backend/openapi.json` changes without regenerating the client — that freshness enforcement is a later step.

## Frontend-to-Backend Integration

`app/api/backend/health/route.ts` demonstrates the full reusable communication path end to end:

```text
Browser → lib/api/client.ts → /api/backend/health → lib/api/server.ts → FastAPI /health
```

The browser calls the same-origin route through `lib/api/client.ts`; the route itself calls FastAPI directly through `lib/api/server.ts`, forwarding a valid incoming `X-Request-ID` or generating one otherwise. On success it returns FastAPI's payload as-is with an `X-Request-ID` response header. On failure it normalizes the error with `normalizeError()` and re-encodes it into the same `{ error: { code, message, details, requestId } }` envelope FastAPI itself returns, so the browser-side normalizer handles both origins identically. The route's own status mapping: an `APIError` preserves FastAPI's real HTTP status; a network failure or timeout — the Next.js server failing to reach FastAPI — returns `503 Service Unavailable`; anything else (an invalid path or a genuinely unexpected error) returns `500 Internal Server Error`. The `X-Request-ID` response header always carries this route's own selected request ID; the JSON envelope's `requestId` carries the backend's own request ID when a structured FastAPI error provided one — the two identify different things and are not merged.

`components/backend-status.tsx` is the browser-facing Client Component that calls this route and renders the result — the live example on the homepage. No browser code accesses `FASTAPI_INTERNAL_URL` or `serverEnv` directly. It shows a loading state, a connected state, and a safe unavailable state with a `Retry` button on failure and a `Refresh` button on success — never an automatic retry — and displays `Reference: <requestId>` only when the normalized error carries one. `AppError.details` is never rendered.

## Error Normalization

Feature code should call `normalizeError(error)` from `lib/errors/normalize.ts`, never inspect `APIError`, `NetworkError`, `TimeoutError`, or `InvalidPathError` directly:

- `lib/errors/types.ts` — the single `AppError` shape every transport or runtime error is converted into: `code`, `message`, `status`, `details`, `requestId`, `retryable`.
- `lib/errors/normalize.ts` — `normalizeError(error: unknown): AppError`. Accepts anything — a transport error, a plain `Error`, a string, `null`, `undefined` — and never throws.
- `lib/errors/messages.ts` — the user-safe generic messages `normalize.ts` uses, kept in one place instead of inlined.

When an `APIError`'s response body matches the backend's `{ error: { code, message, details, requestId } }` envelope, those values are preferred; otherwise `normalizeError` falls back to a generic `http_error` code and a safe message. A backend `requestId`, when present, is always preserved onto `AppError.requestId`.

`retryable` is `true` only for `NetworkError`, `TimeoutError`, and `APIError` with status `408`, `429`, `500`, `502`, `503`, or `504`; everything else is `false`.

## Testing

```bash
pnpm test        # run once
pnpm test:watch  # watch mode
```

Jest runs through Next.js's built-in [`next/jest`](https://nextjs.org/docs) integration (`jest.config.ts`), which handles SWC transforms, CSS/image/font mocking, and `.env` loading automatically. `moduleNameMapper` mirrors the `@/*` path alias, since `next/jest` transforms that alias but does not resolve it for Jest's own module resolution. `jest.setup.ts` loads `@testing-library/jest-dom` matchers for every test via `setupFilesAfterEnv`.

Tests live under `tests/`, mirrored by layer rather than by feature:

- `tests/api/` — the API client foundation (`lib/api/`): error classes, construction, inheritance, and type-level checks proving the generated contract still exposes the expected operations and response shapes.
- `tests/errors/` — the error normalization layer (`lib/errors/`): `normalizeError()` across every transport error type and unrecognized thrown value.
- `tests/integration/` — the `/api/backend/health` route handler, run under `testEnvironment: "node"` (it constructs and reads native `Request`/`Response` objects) with `lib/api/server.ts` mocked at the module boundary, so route orchestration is tested independently of fetch, transport behavior, and any running backend.
- `tests/components/` — `BackendStatus`, with `lib/api/client.ts` mocked at the module boundary rather than mocking `fetch`, since jsdom does not implement the Fetch API.

End-to-end coverage is out of scope for Jest and belongs to Playwright once the application is integrated.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
