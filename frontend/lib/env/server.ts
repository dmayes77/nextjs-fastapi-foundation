import "server-only";

import { assertUrlVariables, validateOriginVariable } from "./shared";

/**
 * Server-only environment contract.
 *
 * `server-only` above causes a build error if this module is ever imported
 * into a Client Component, enforcing that these values never reach the
 * browser bundle.
 */
export interface ServerEnv {
  /**
   * The canonical frontend origin (e.g. "https://example.com"). Used for
   * server-generated absolute URLs — metadata, canonical links, password
   * reset and email links, OAuth callbacks. Never used for browser fetches
   * and never a security boundary; future auth/callback validation uses
   * explicit allow-lists, not this value.
   */
  appOrigin: string;
  /**
   * The FastAPI origin used by Server Components and Server Actions for
   * direct server-to-server requests. Must never be exposed through a
   * `NEXT_PUBLIC_` variable.
   */
  fastapiInternalUrl: string;
}

function loadServerEnv(): ServerEnv {
  const values = assertUrlVariables([
    validateOriginVariable("APP_ORIGIN", process.env.APP_ORIGIN),
    validateOriginVariable("FASTAPI_INTERNAL_URL", process.env.FASTAPI_INTERNAL_URL),
  ]);

  return {
    appOrigin: values.APP_ORIGIN,
    fastapiInternalUrl: values.FASTAPI_INTERNAL_URL,
  };
}

export const serverEnv: ServerEnv = loadServerEnv();
