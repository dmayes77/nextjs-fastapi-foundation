import { assertApiPath, request, type ApiResponse, type RequestOptions } from "./shared";

/**
 * Browser-safe API client.
 *
 * `path` must be a relative, same-origin path (e.g. `/api/example`), never
 * an absolute URL — the browser never talks to FastAPI directly. This file
 * must never import `./server` or reference `FASTAPI_INTERNAL_URL`.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(assertApiPath(path), options);
}
