/**
 * Shared, side-effect-free environment helpers.
 *
 * No secrets and no server-only logic belong here — only validation
 * primitives usable by both `server.ts` and `client.ts`.
 */

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

interface UrlValidationResult {
  variableName: string;
  value?: string;
  error?: string;
}

/** Validates that a single environment variable is present and a well-formed URL. */
export function validateUrlVariable(
  variableName: string,
  rawValue: string | undefined,
): UrlValidationResult {
  if (!rawValue || rawValue.trim() === "") {
    return {
      variableName,
      error: `Missing required environment variable "${variableName}". Expected an absolute URL.`,
    };
  }

  try {
    new URL(rawValue);
  } catch {
    return {
      variableName,
      // Deliberately excludes the raw value: environment error messages
      // must never echo the configured value back, even though URLs are
      // not typically secret, to keep this path safe by default.
      error: `Environment variable "${variableName}" must be a valid absolute URL.`,
    };
  }

  return { variableName, value: rawValue };
}

/**
 * Collects every validation problem and throws once with all of them, so a
 * developer can fix every broken variable in one pass instead of discovering
 * them one at a time.
 */
export function assertUrlVariables(results: UrlValidationResult[]): Record<string, string> {
  const errors = results
    .filter((result): result is UrlValidationResult & { error: string } => Boolean(result.error))
    .map((result) => result.error);

  if (errors.length > 0) {
    throw new EnvValidationError(
      `Invalid environment configuration:\n${errors.map((message) => `  - ${message}`).join("\n")}`,
    );
  }

  return Object.fromEntries(
    results.map((result) => [result.variableName, result.value as string]),
  );
}
