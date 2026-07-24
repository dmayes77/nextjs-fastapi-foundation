import { NextResponse, type NextRequest } from "next/server";

import { healthGet } from "@/lib/api/contracts";
import { apiRequest } from "@/lib/api/server";
import { normalizeError } from "@/lib/errors/normalize";
import type { AppError } from "@/lib/errors/types";

const REQUEST_ID_HEADER = "X-Request-ID";
// Mirrors backend/app/middleware/request_id.py exactly (MAX_REQUEST_ID_LENGTH,
// _ALLOWED_CHARS): FastAPI silently replaces anything that fails this same
// check with its own generated UUID, so accepting a broader value here would
// desync the ID this route echoes from the one FastAPI actually logs.
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function isValidRequestId(value: string): boolean {
  return value.length <= MAX_REQUEST_ID_LENGTH && REQUEST_ID_PATTERN.test(value);
}

// No trimming: an incoming value is either preserved exactly or rejected
// outright in favor of a generated UUID, never rewritten — matching the
// backend, which does not trim either.
function resolveRequestId(request: NextRequest): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  return incoming && isValidRequestId(incoming) ? incoming : crypto.randomUUID();
}

/**
 * An `APIError` carries the real FastAPI status; every other normalized
 * error has `status: null` and is mapped here. Network failures and
 * timeouts are the Next.js server failing to reach FastAPI, not a client
 * mistake, so both map to 503 (Service Unavailable). Anything else —
 * an invalid request path or a genuinely unexpected error — is this route's
 * own fault, so both map to 500 (Internal Server Error).
 */
function resolveResponseStatus(normalized: AppError): number {
  if (normalized.status !== null) {
    return normalized.status;
  }

  switch (normalized.code) {
    case "network_error":
    case "request_timeout":
      return 503;
    default:
      return 500;
  }
}

/**
 * `normalizeError()` intentionally preserves the raw upstream response body
 * in `details` when FastAPI's response isn't its own structured error
 * envelope (`code: "http_error"`) — correct for the shared transport layer,
 * which callers may want for debugging. This public health bridge must
 * never forward arbitrary upstream HTML, text, or debug output to the
 * browser, so only a genuine backend-provided `details` value (from a real
 * `{ error: { ... } }` envelope) is ever passed through; the raw-passthrough
 * fallback case is always nulled out here instead.
 */
function resolveResponseDetails(normalized: AppError): unknown {
  return normalized.code === "http_error" ? null : normalized.details;
}

/**
 * Demonstrates the reusable browser-to-FastAPI communication path: the
 * browser calls this same-origin route through `lib/api/client.ts`, and this
 * route calls FastAPI directly through the server-only `lib/api/server.ts`.
 * Errors are normalized here — not re-thrown as a raw transport error — and
 * re-encoded into the same `{ error: { code, message, details, requestId } }`
 * envelope FastAPI itself returns, so the browser-side normalizer handles
 * both origins identically.
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const data = await healthGet(apiRequest, { requestId });

    return NextResponse.json(data, {
      headers: { [REQUEST_ID_HEADER]: requestId },
    });
  } catch (error) {
    const normalized = normalizeError(error);
    // The route's own selected request ID is always echoed in the response
    // header, correlating this specific HTTP exchange end to end. The
    // backend's own request ID (when a structured FastAPI error envelope
    // provided one) is preserved in the JSON body instead, since it
    // identifies the upstream FastAPI request the failure actually
    // originated from — the two are deliberately not merged.
    return NextResponse.json(
      {
        error: {
          code: normalized.code,
          message: normalized.message,
          details: resolveResponseDetails(normalized),
          requestId: normalized.requestId ?? requestId,
        },
      },
      {
        status: resolveResponseStatus(normalized),
        headers: { [REQUEST_ID_HEADER]: requestId },
      },
    );
  }
}
