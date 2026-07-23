import type { Config } from "jest";
import nextJest from "next/jest.js";

// Loads next.config.ts and .env files into the test environment.
const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // Mirrors the `@/*` -> `./*` alias in tsconfig.json. next/jest transforms
    // TypeScript path aliases but does not resolve them for Jest's own
    // module resolution, so this is required for any test that imports via
    // the `@/` alias.
    "^@/(.*)$": "<rootDir>/$1",
  },
};

// Exported this way so next/jest can load the async Next.js config first.
export default createJestConfig(config);
