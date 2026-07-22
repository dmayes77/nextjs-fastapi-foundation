# frontend

The Next.js App Router frontend for Next.js FastAPI Foundation.

## Quick Start

```bash
pnpm dev
```

Visit http://localhost:3000

## Environment

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
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

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
