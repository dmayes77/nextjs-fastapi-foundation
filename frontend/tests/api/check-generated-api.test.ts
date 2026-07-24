/**
 * Tests the freshness checker itself (frontend/scripts/check-generated-api.mjs)
 * entirely against temporary directories and a small in-memory-derived
 * OpenAPI fixture — never against the real backend/openapi.json or the
 * real committed frontend/lib/api/generated/{schema,operations}.ts.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  compareGeneratedFile,
  findExtraGeneratedFiles,
  generateFreshOperations,
  generateFreshSchema,
  runFreshnessCheck,
} from "../../scripts/check-generated-api.mjs";

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const OPENAPI_TYPESCRIPT_BIN = path.resolve(
  FRONTEND_ROOT,
  "node_modules/.bin/openapi-typescript",
);

const VALID_OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: { title: "Fixture", version: "0.1.0" },
  paths: {
    "/health": {
      get: {
        operationId: "health_get",
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
  },
};

let tempRoot: string;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(os.tmpdir(), "check-generated-api-test-"));
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

function writeOpenapiFixture(dir: string, document: unknown = VALID_OPENAPI_DOCUMENT): string {
  const openapiPath = path.join(dir, "openapi.json");
  writeFileSync(openapiPath, JSON.stringify(document), "utf8");
  return openapiPath;
}

describe("compareGeneratedFile", () => {
  it("returns null when the committed and fresh files are byte-identical", () => {
    const committedPath = path.join(tempRoot, "committed.ts");
    const freshPath = path.join(tempRoot, "fresh.ts");
    writeFileSync(committedPath, "export const x = 1;\n", "utf8");
    writeFileSync(freshPath, "export const x = 1;\n", "utf8");

    expect(compareGeneratedFile("x.ts", committedPath, freshPath)).toBeNull();
  });

  it("reports staleness when the committed and fresh files differ", () => {
    const committedPath = path.join(tempRoot, "committed.ts");
    const freshPath = path.join(tempRoot, "fresh.ts");
    writeFileSync(committedPath, "export const x = 1;\n", "utf8");
    writeFileSync(freshPath, "export const x = 2;\n", "utf8");

    expect(compareGeneratedFile("x.ts", committedPath, freshPath)).toMatch(/x\.ts is stale/);
  });

  it("reports a missing committed file distinctly from a stale one", () => {
    const committedPath = path.join(tempRoot, "does-not-exist.ts");
    const freshPath = path.join(tempRoot, "fresh.ts");
    writeFileSync(freshPath, "export const x = 1;\n", "utf8");

    expect(compareGeneratedFile("x.ts", committedPath, freshPath)).toMatch(
      /x\.ts is missing from lib\/api\/generated\//,
    );
  });
});

describe("findExtraGeneratedFiles", () => {
  it("returns an empty list when only expected files are present", () => {
    writeFileSync(path.join(tempRoot, "schema.ts"), "", "utf8");
    writeFileSync(path.join(tempRoot, "operations.ts"), "", "utf8");

    expect(findExtraGeneratedFiles(tempRoot, ["schema.ts", "operations.ts"])).toEqual([]);
  });

  it("detects a file present that generation does not produce", () => {
    writeFileSync(path.join(tempRoot, "schema.ts"), "", "utf8");
    writeFileSync(path.join(tempRoot, "operations.ts"), "", "utf8");
    writeFileSync(path.join(tempRoot, "stray.ts"), "", "utf8");

    expect(findExtraGeneratedFiles(tempRoot, ["schema.ts", "operations.ts"])).toEqual([
      "stray.ts",
    ]);
  });

  it("returns an empty list for a directory that does not exist yet", () => {
    expect(
      findExtraGeneratedFiles(path.join(tempRoot, "missing-dir"), ["schema.ts", "operations.ts"]),
    ).toEqual([]);
  });
});

describe("generateFreshOperations", () => {
  it("writes a real operations.ts derived from a valid OpenAPI document", () => {
    const openapiPath = writeOpenapiFixture(tempRoot);

    const outputPath = generateFreshOperations(openapiPath, tempRoot);

    const content = readFileSync(outputPath, "utf8");
    expect(content).toContain("export const healthGetOperation");
    expect(content).toContain('operationId: "health_get"');
  });

  it("throws when the OpenAPI document is contractually invalid", () => {
    const invalidDocument = {
      openapi: "3.1.0",
      info: { title: "Fixture", version: "0.1.0" },
      paths: {
        "/health": {
          // Missing operationId — collectOperations() must reject this.
          get: { responses: {} },
        },
      },
    };
    const openapiPath = writeOpenapiFixture(tempRoot, invalidDocument);

    expect(() => generateFreshOperations(openapiPath, tempRoot)).toThrow(
      /has no "operationId"/,
    );
  });
});

describe("generateFreshSchema", () => {
  it("writes a real schema.ts via the openapi-typescript CLI", () => {
    const openapiPath = writeOpenapiFixture(tempRoot);

    const outputPath = generateFreshSchema(openapiPath, tempRoot, OPENAPI_TYPESCRIPT_BIN);

    const content = readFileSync(outputPath, "utf8");
    expect(content).toContain("health_get");
  });

  it("throws (via execFileSync) when the OpenAPI document does not exist", () => {
    const missingPath = path.join(tempRoot, "does-not-exist.json");

    expect(() => generateFreshSchema(missingPath, tempRoot, OPENAPI_TYPESCRIPT_BIN)).toThrow();
  });
});

describe("runFreshnessCheck", () => {
  function buildFreshCommittedDir(): { committedDir: string; openapiPath: string } {
    const openapiPath = writeOpenapiFixture(tempRoot);
    const committedDir = path.join(tempRoot, "committed");
    mkdirSync(committedDir, { recursive: true });

    const genDir = mkdtempSync(path.join(os.tmpdir(), "check-generated-api-golden-"));
    try {
      const freshSchemaPath = generateFreshSchema(openapiPath, genDir, OPENAPI_TYPESCRIPT_BIN);
      const freshOperationsPath = generateFreshOperations(openapiPath, genDir);
      writeFileSync(
        path.join(committedDir, "schema.ts"),
        readFileSync(freshSchemaPath, "utf8"),
        "utf8",
      );
      writeFileSync(
        path.join(committedDir, "operations.ts"),
        readFileSync(freshOperationsPath, "utf8"),
        "utf8",
      );
    } finally {
      rmSync(genDir, { recursive: true, force: true });
    }

    return { committedDir, openapiPath };
  }

  it("exits 0 when both committed files match current generation exactly", () => {
    const { committedDir, openapiPath } = buildFreshCommittedDir();

    const result = runFreshnessCheck({
      openapiPath,
      committedDir,
      openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
    });

    expect(result.exitCode).toBe(0);
  });

  it("exits non-zero and names the stale file when operations.ts is stale", () => {
    const { committedDir, openapiPath } = buildFreshCommittedDir();
    writeFileSync(path.join(committedDir, "operations.ts"), "// stale\n", "utf8");

    const result = runFreshnessCheck({
      openapiPath,
      committedDir,
      openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
    });

    expect(result.exitCode).toBe(1);
    expect(result.messages.some((message) => message.includes("operations.ts is stale"))).toBe(
      true,
    );
  });

  it("exits non-zero and names the stale file when schema.ts is stale", () => {
    const { committedDir, openapiPath } = buildFreshCommittedDir();
    writeFileSync(path.join(committedDir, "schema.ts"), "// stale\n", "utf8");

    const result = runFreshnessCheck({
      openapiPath,
      committedDir,
      openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
    });

    expect(result.exitCode).toBe(1);
    expect(result.messages.some((message) => message.includes("schema.ts is stale"))).toBe(true);
  });

  it("exits non-zero when a generated file is missing entirely", () => {
    const { committedDir, openapiPath } = buildFreshCommittedDir();
    rmSync(path.join(committedDir, "operations.ts"));

    const result = runFreshnessCheck({
      openapiPath,
      committedDir,
      openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
    });

    expect(result.exitCode).toBe(1);
    expect(result.messages.some((message) => message.includes("operations.ts is missing"))).toBe(
      true,
    );
  });

  it("exits non-zero when an extra, non-generated file is present", () => {
    const { committedDir, openapiPath } = buildFreshCommittedDir();
    writeFileSync(path.join(committedDir, "stray.ts"), "", "utf8");

    const result = runFreshnessCheck({
      openapiPath,
      committedDir,
      openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
    });

    expect(result.exitCode).toBe(1);
    expect(result.messages.some((message) => message.includes("stray.ts"))).toBe(true);
  });

  it("exits non-zero and reports the failure when generation itself fails", () => {
    const { committedDir } = buildFreshCommittedDir();
    const missingOpenapiPath = path.join(tempRoot, "does-not-exist.json");

    const result = runFreshnessCheck({
      openapiPath: missingOpenapiPath,
      committedDir,
      openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN,
    });

    expect(result.exitCode).toBe(1);
    expect(
      result.messages.some((message) => message.includes("Failed to generate schema.ts")),
    ).toBe(true);
  });

  it("leaves no temporary directory behind after a run", () => {
    const { committedDir, openapiPath } = buildFreshCommittedDir();
    const before = readdirSync(os.tmpdir()).filter((name) =>
      name.startsWith("next-fastapi-api-check-"),
    );

    runFreshnessCheck({ openapiPath, committedDir, openapiTypescriptBin: OPENAPI_TYPESCRIPT_BIN });

    const after = readdirSync(os.tmpdir()).filter((name) =>
      name.startsWith("next-fastapi-api-check-"),
    );
    expect(after.length).toBe(before.length);
  });
});
