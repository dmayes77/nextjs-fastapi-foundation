/**
 * Shared, isomorphic request foundation used by both the browser client
 * (`./client.ts`) and the server client (`./server.ts`). No secrets and no
 * server-only logic belong here.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export class APIError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends Error {
  constructor(message = "Unable to reach the server.", options?: ErrorOptions) {
    super(message, options);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(message = "The request timed out.") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class InvalidPathError extends Error {
  constructor(
    message = 'API request path must begin with "/" and must not include an origin.',
  ) {
    super(message);
    this.name = "InvalidPathError";
  }
}

/**
 * Validates that `path` is a same-origin application path: a string that
 * begins with exactly one `/`, is not protocol-relative (`//host/...`), and
 * cannot itself be parsed as an absolute URL (which would mean it carries
 * its own scheme, such as `http:`, `https:`, `mailto:`, or `javascript:`).
 * Used by both clients so neither can be pointed at an arbitrary origin.
 */
export function assertApiPath(path: string): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new InvalidPathError();
  }

  let parsesAsAbsoluteUrl = true;
  try {
    new URL(path);
  } catch {
    parsesAsAbsoluteUrl = false;
  }

  if (parsesAsAbsoluteUrl) {
    throw new InvalidPathError();
  }

  return path;
}

export interface RequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

interface KnownErrorEnvelope {
  error?: { message?: unknown };
}

function isKnownErrorEnvelope(data: unknown): data is KnownErrorEnvelope {
  return typeof data === "object" && data !== null && "error" in data;
}

function deriveErrorMessage(data: unknown, status: number): string {
  if (isKnownErrorEnvelope(data) && typeof data.error?.message === "string") {
    return data.error.message;
  }
  return `Request failed with status ${status}.`;
}

/**
 * Reads a response body safely. Never throws on an empty body or invalid
 * JSON, never returns `undefined`, and reads the body only once:
 *
 * - `204 No Content` or empty text → `null`
 * - Valid JSON → the parsed value
 * - Non-empty text that is not valid JSON → the raw text, preserved as-is
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * The shared request implementation. Both the browser and server clients
 * call this with an already-resolved URL (relative for the browser,
 * absolute for the server) and normalize every failure into one of
 * `APIError`, `NetworkError`, or `TimeoutError` — a caller never sees a raw
 * `fetch()` rejection.
 */
export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", headers, body } = options;

  const hasBody = body !== undefined;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (hasBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new TimeoutError();
    }
    throw new NetworkError("Unable to reach the server.", { cause });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await parseResponseBody(response)) as T;

  if (!response.ok) {
    throw new APIError(deriveErrorMessage(data, response.status), response.status, data);
  }

  return { status: response.status, data };
}
