import "server-only";

import { serverEnv } from "@/lib/env/server";

import { assertApiPath, request, type ApiResponse, type RequestOptions } from "./shared";

export interface ServerRequestOptions extends RequestOptions {
  /** Forwarded as the X-Request-ID header when provided, correlating this
   * request with the incoming request it originated from. */
  requestId?: string;
}

/**
 * Server-only FastAPI client for Server Components and Server Actions.
 *
 * `path` is resolved against `FASTAPI_INTERNAL_URL` — pass an absolute path
 * such as `/health`, never a full URL. The path is validated before
 * resolution, so a caller cannot supply an absolute URL to override the
 * configured FastAPI origin (`new URL(path, base)` would otherwise silently
 * ignore `base` when `path` is itself absolute). No authentication and no
 * retry logic are implemented yet.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { requestId, headers, ...rest } = options;

  const url = new URL(assertApiPath(path), serverEnv.fastapiInternalUrl).toString();

  const mergedHeaders = new Headers(headers);
  if (requestId) {
    mergedHeaders.set("X-Request-ID", requestId);
  }

  return request<T>(url, { ...rest, headers: mergedHeaders });
}
