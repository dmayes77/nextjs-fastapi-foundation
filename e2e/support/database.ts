import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

type DatabaseCommand = "validate" | "prepare" | "cleanup";

function resolvePlaywrightDatabaseUrl(): string {
  const result = spawnSync(
    "uv",
    ["run", "python", "-m", "scripts.e2e_database", "normalize"],
    {
      cwd: resolve(process.cwd(), "backend"),
      env: process.env,
      encoding: "utf8",
    },
  );

  if (result.error || result.status !== 0) {
    throw new Error("Playwright database URL normalization failed.");
  }

  const canonicalUrl = result.stdout.trim();
  if (!canonicalUrl) {
    throw new Error("Playwright database URL normalization returned no value.");
  }
  return canonicalUrl;
}

export const playwrightDatabaseUrl = resolvePlaywrightDatabaseUrl();

export function runDatabaseCommand(command: DatabaseCommand): void {
  const result = spawnSync(
    "uv",
    ["run", "python", "-m", "scripts.e2e_database", command],
    {
      cwd: resolve(process.cwd(), "backend"),
      env: {
        ...process.env,
        PLAYWRIGHT_DATABASE_URL: playwrightDatabaseUrl,
      },
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw new Error(`Could not start Playwright database ${command}.`);
  }
  if (result.status !== 0) {
    throw new Error(`Playwright database ${command} failed.`);
  }
}
