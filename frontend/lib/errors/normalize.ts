import { APIError, InvalidPathError, NetworkError, TimeoutError } from "../api/shared";
import { ERROR_MESSAGES } from "./messages";
import type { AppError } from "./types";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

interface BackendErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    requestId?: unknown;
  };
}

function isBackendErrorEnvelope(data: unknown): data is BackendErrorEnvelope {
  return typeof data === "object" && data !== null && "error" in data;
}

/**
 * Maps an `APIError` to `AppError`, preferring the backend's own
 * `{ error: { code, message, details, requestId } }` envelope when the
 * response body matches it, and falling back to safe generic values
 * (`http_error`, the raw HTTP-status message) when it doesn't — e.g. a
 * non-JSON error body, which `lib/api/shared.ts` preserves as plain text
 * rather than discarding.
 */
function normalizeApiError(error: APIError): AppError {
  const envelope = isBackendErrorEnvelope(error.details) ? error.details.error : undefined;

  return {
    code: typeof envelope?.code === "string" ? envelope.code : "http_error",
    message: typeof envelope?.message === "string" ? envelope.message : error.message,
    status: error.status,
    details: envelope ? (envelope.details ?? null) : (error.details ?? null),
    requestId: typeof envelope?.requestId === "string" ? envelope.requestId : null,
    retryable: RETRYABLE_STATUS_CODES.has(error.status),
  };
}

/**
 * Converts any thrown value into one consistent `AppError` shape. Feature
 * code should always call this instead of checking `APIError`,
 * `NetworkError`, `TimeoutError`, or `InvalidPathError` directly — this is
 * the only place that needs to know those types exist. Never throws,
 * regardless of what is passed in.
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof APIError) {
    return normalizeApiError(error);
  }

  if (error instanceof NetworkError) {
    return {
      code: "network_error",
      message: ERROR_MESSAGES.network,
      status: null,
      details: null,
      requestId: null,
      retryable: true,
    };
  }

  if (error instanceof TimeoutError) {
    return {
      code: "request_timeout",
      message: ERROR_MESSAGES.timeout,
      status: null,
      details: null,
      requestId: null,
      retryable: true,
    };
  }

  if (error instanceof InvalidPathError) {
    return {
      code: "invalid_request_path",
      message: ERROR_MESSAGES.invalidPath,
      status: null,
      details: null,
      requestId: null,
      retryable: false,
    };
  }

  // Any other Error instance, or a non-error thrown value (string, number,
  // null, undefined, ...): normalize to a safe generic shape rather than
  // ever throwing while normalizing.
  return {
    code: "unexpected_error",
    message: ERROR_MESSAGES.unexpected,
    status: null,
    details: null,
    requestId: null,
    retryable: false,
  };
}
