import { NextResponse, type NextRequest } from "next/server";

import { apiRequest } from "@/lib/api/server";
import { normalizeError } from "@/lib/errors/normalize";
import type { AppError } from "@/lib/errors/types";

const REQUEST_ID_HEADER = "X-Request-ID";
const MAX_REQUEST_ID_LENGTH = 128;

function containsControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isValidRequestId(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH && !containsControlCharacter(value)
  );
}

function resolveRequestId(request: NextRequest): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim();
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
    const { data } = await apiRequest("/health", { requestId });

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
          details: normalized.details,
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
