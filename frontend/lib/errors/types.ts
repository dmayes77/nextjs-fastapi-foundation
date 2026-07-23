/**
 * The single normalized application error shape. Every transport or
 * runtime error — `APIError`, `NetworkError`, `TimeoutError`,
 * `InvalidPathError`, or anything else — is converted into this shape by
 * `normalizeError()` before reaching feature code.
 */
export interface AppError {
  code: string;
  message: string;
  status: number | null;
  details: unknown;
  requestId: string | null;
  retryable: boolean;
}
