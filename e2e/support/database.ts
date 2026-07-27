import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const playwrightDatabaseUrl =
  process.env.PLAYWRIGHT_DATABASE_URL ??
  "postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_e2e_test";

type DatabaseCommand = "validate" | "prepare" | "cleanup";

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
