/**
 * Centralized, user-safe error messages. `normalize.ts` reads from here
 * instead of inlining literal strings, so every generic message has one
 * source of truth.
 */
export const ERROR_MESSAGES = {
  network: "Unable to connect to the server.",
  timeout: "The request took too long. Please try again.",
  invalidPath: "The application could not create a valid API request.",
  unexpected: "Something went wrong.",
} as const;
