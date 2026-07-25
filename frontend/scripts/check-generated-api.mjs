#!/usr/bin/env node
/**
 * Verifies that the committed frontend generated API artifacts
 * (lib/api/generated/schema.ts and lib/api/generated/operations.ts) are
 * exactly what `pnpm api:generate` would produce right now from the
 * committed backend/openapi.json — without ever writing to those
 * committed files itself.
 *
 * This reuses the exact same generation pipeline as `pnpm api:generate`,
 * redirected to a temporary directory instead of the committed one:
 *
 * - schema.ts: the same `openapi-typescript` CLI binary, given a
 *   temporary `-o` path.
 * - operations.ts: the same pure `collectOperations`/`render` functions
 *   exported from generate-api-operations.mjs, called in-process — never
 *   that script's own `main()`, which always writes to the committed
 *   path and is left untouched by this file.
 *
 * All functions below are pure/parameterized and exported so this
 * freshness check can be unit tested against temporary fixture
 * directories, never against the real committed generated files.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { collectOperations, render } from "./generate-api-operations.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(scriptDir, "..");

const OPENAPI_PATH = path.resolve(FRONTEND_ROOT, "../backend/openapi.json");
const OPENAPI_TYPESCRIPT_BIN = path.resolve(
  FRONTEND_ROOT,
  "node_modules/.bin/openapi-typescript",
);
const COMMITTED_DIR = path.resolve(FRONTEND_ROOT, "lib/api/generated");

const EXPECTED_FILE_NAMES = ["schema.ts", "operations.ts"];

/**
 * Runs the real `openapi-typescript` CLI — the same binary and arguments
 * `pnpm api:generate` uses — pointed at a temporary output path so the
 * committed schema.ts is never touched.
 */
export function generateFreshSchema(openapiPath, tempDir, openapiTypescriptBin) {
  const tempSchemaPath = path.join(tempDir, "schema.ts");
  execFileSync(
    openapiTypescriptBin,
    [
      openapiPath,
      "--default-non-nullable",
      "false",
      "-o",
      tempSchemaPath,
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  return tempSchemaPath;
}

/**
 * Calls the generator's own exported `collectOperations`/`render` — the
 * same pure logic `generate-api-operations.mjs`'s `main()` uses — and
 * writes the result to a temporary path instead of the committed one.
 */
export function generateFreshOperations(openapiPath, tempDir) {
  const openapi = JSON.parse(readFileSync(openapiPath, "utf8"));
  const operations = collectOperations(openapi);
  const output = render(operations);
  const tempOperationsPath = path.join(tempDir, "operations.ts");
  writeFileSync(tempOperationsPath, output, "utf8");
  return tempOperationsPath;
}

/**
 * Byte-for-byte comparison only — never timestamps, never a hash taken
 * after any formatting step, since neither generator runs one. A stale
 * file and a fresh one are distinguished purely by their raw contents.
 */
export function compareGeneratedFile(name, committedPath, freshPath) {
  if (!existsSync(committedPath)) {
    return `${name} is missing from lib/api/generated/, but generation produces it. Run \`pnpm api:generate\` and commit the result.`;
  }
  if (!existsSync(freshPath)) {
    return `${name} could not be generated for comparison.`;
  }

  const committed = readFileSync(committedPath, "utf8");
  const fresh = readFileSync(freshPath, "utf8");

  if (committed !== fresh) {
    return `${name} is stale: the committed lib/api/generated/${name} does not match what \`pnpm api:generate\` would produce right now from backend/openapi.json. Run \`pnpm api:generate\` and commit the result.`;
  }

  return null;
}

/**
 * Detects a committed file in lib/api/generated/ that current generation
 * no longer produces (e.g. left over from a prior generator version).
 */
export function findExtraGeneratedFiles(committedDir, expectedNames) {
  if (!existsSync(committedDir)) {
    return [];
  }
  return readdirSync(committedDir).filter((name) => !expectedNames.includes(name));
}

/**
 * Runs the full freshness check and returns a result instead of touching
 * process.exit/console directly, so it can be unit tested. Always cleans
 * up its temporary directory, even on failure.
 */
export function runFreshnessCheck({
  openapiPath,
  committedDir,
  openapiTypescriptBin,
  expectedNames = EXPECTED_FILE_NAMES,
}) {
  let tempDir;
  try {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "next-fastapi-api-check-"));
  } catch (cause) {
    return {
      exitCode: 1,
      messages: [`Failed to create a temporary directory for freshness checking: ${cause.message}`],
    };
  }

  try {
    const messages = [];

    for (const extraName of findExtraGeneratedFiles(committedDir, expectedNames)) {
      messages.push(
        `${extraName} is present in lib/api/generated/ but is not produced by generation. Remove it or regenerate.`,
      );
    }

    let freshSchemaPath;
    try {
      freshSchemaPath = generateFreshSchema(openapiPath, tempDir, openapiTypescriptBin);
    } catch (cause) {
      return {
        exitCode: 1,
        messages: [...messages, `Failed to generate schema.ts for comparison: ${cause.message}`],
      };
    }

    let freshOperationsPath;
    try {
      freshOperationsPath = generateFreshOperations(openapiPath, tempDir);
    } catch (cause) {
      return {
        exitCode: 1,
        messages: [
          ...messages,
          `Failed to generate operations.ts for comparison: ${cause.message}`,
        ],
      };
    }

    const schemaMessage = compareGeneratedFile(
      "schema.ts",
      path.join(committedDir, "schema.ts"),
      freshSchemaPath,
    );
    if (schemaMessage) {
      messages.push(schemaMessage);
    }

    const operationsMessage = compareGeneratedFile(
      "operations.ts",
      path.join(committedDir, "operations.ts"),
      freshOperationsPath,
    );
    if (operationsMessage) {
      messages.push(operationsMessage);
    }

    if (messages.length > 0) {
      return { exitCode: 1, messages };
    }

    return {
      exitCode: 0,
      messages: ["Generated frontend API artifacts are up to date with backend/openapi.json."],
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const result = runFreshnessCheck({
    openapiPath: OPENAPI_PATH,
    committedDir: COMMITTED_DIR,
    openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
  });

  for (const message of result.messages) {
    if (result.exitCode === 0) {
      console.log(message);
    } else {
      console.error(message);
    }
  }

  return result.exitCode;
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  process.exit(main());
}
