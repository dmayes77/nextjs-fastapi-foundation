/**
 * Browser-safe environment variables only.
 *
 * Everything exported here is bundled into client JavaScript. Never add
 * `APP_ORIGIN` or `FASTAPI_INTERNAL_URL` here — those must remain
 * server-only (see `./server.ts`).
 *
 * No browser-safe variables are required yet. Add `NEXT_PUBLIC_`-prefixed
 * values here as they become necessary.
 */
export const clientEnv = {} as const;
