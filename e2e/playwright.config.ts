import { defineConfig, devices } from "@playwright/test";

import { playwrightDatabaseUrl, runDatabaseCommand } from "./support/database";

// Config evaluation precedes Playwright's web-server startup. This guard ensures an
// unsafe target cannot start either application process. It does not prepare the
// database — that is `pnpm test:e2e`'s job (see package.json), run once before this
// config is even loaded, so preparation (migration + cleanup) never runs twice.
// Direct `pnpm exec playwright test --config=e2e/playwright.config.ts` is
// consequently not a supported entry point: use `pnpm test:e2e`.
runDatabaseCommand("validate");

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  retries: isCI ? 1 : 0,
  reporter: "line",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "off",
    trace: isCI ? "on-first-retry" : "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: "pnpm dev:backend",
      url: "http://127.0.0.1:8000/health",
      env: {
        DATABASE_URL: playwrightDatabaseUrl,
        DATABASE_MIGRATION_URL: playwrightDatabaseUrl,
      },
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: {
        signal: "SIGTERM",
        timeout: 5_000,
      },
    },
    {
      command: "pnpm dev:frontend",
      url: "http://localhost:3000",
      env: {
        FASTAPI_INTERNAL_URL: "http://127.0.0.1:8000",
        APP_ORIGIN: "http://localhost:3000",
      },
      reuseExistingServer: false,
      timeout: 90_000,
      gracefulShutdown: {
        signal: "SIGTERM",
        timeout: 5_000,
      },
    },
  ],
});
