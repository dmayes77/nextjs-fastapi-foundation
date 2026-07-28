/**
 * Regression coverage for the `brace-expansion` pnpm override in
 * `frontend/pnpm-workspace.yaml`. GHSA-mh99-v99m-4gvg covers every
 * brace-expansion release <=5.0.7, but 5.x changed its CommonJS export
 * shape and breaks `minimatch` versions older than 10.x. Only
 * minimatch@10.2.5's `^5.0.5` request is overridden to the patched 5.0.8;
 * minimatch@5.1.9 and minimatch@9.0.9 are intentionally left on their
 * natural (still-vulnerable) brace-expansion@2.x resolution because
 * forcing them to 5.x reproducibly breaks brace-pattern matching.
 *
 * This exercises the real installed packages (not a YAML/string check) by
 * walking the actual require chain from each package's real consumer down
 * to `minimatch`, using Node's own module resolution — not a hardcoded
 * pnpm virtual-store path — so it keeps working across pnpm store-layout
 * or peer-hash changes as long as the dependency graph itself is stable.
 */
import fs from "node:fs";
import path from "node:path";

const FRONTEND_ROOT = path.resolve(__dirname, "..");

/** package.json contents keyed by "name", not resolvable via subpath exports for every package. */
function readPackageJson(dir: string): { name: string; version: string } {
  return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
}

/** Resolves `pkgName`'s package root directory as seen from `anchorDir`, by resolving its
 * main entry point (not the `/package.json` subpath, which some packages' `exports` field
 * blocks) and walking up until the owning `package.json` is found. */
function resolvePackageDir(anchorDir: string, pkgName: string): string {
  const entry = require.resolve(pkgName, { paths: [anchorDir] });
  let dir = path.dirname(entry);
  for (;;) {
    const pkgJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgJsonPath) && readPackageJson(dir).name === pkgName) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not resolve package.json for "${pkgName}" from ${entry}`);
    }
    dir = parent;
  }
}

/** Walks a real require chain (each entry a package required by the previous one) starting
 * from the frontend project root, returning the final package's installed directory. */
function resolveChain(chain: string[]): string {
  return chain.reduce((anchorDir, pkgName) => resolvePackageDir(anchorDir, pkgName), FRONTEND_ROOT);
}

const MINIMATCH_CONSUMERS = {
  "minimatch@3.1.5 (via eslint > @eslint/config-array, the accepted residual path)": {
    chain: ["eslint", "@eslint/config-array", "minimatch"],
    expectedMinimatchVersion: "3.1.5",
    expectedBraceExpansionVersion: "1.1.16",
  },
  "minimatch@5.1.9 (via openapi-typescript > @redocly/openapi-core)": {
    chain: ["openapi-typescript", "@redocly/openapi-core", "minimatch"],
    expectedMinimatchVersion: "5.1.9",
    expectedBraceExpansionVersion: "2.1.2",
  },
  "minimatch@9.0.9 (via jest > @jest/core > glob)": {
    chain: ["jest", "@jest/core", "glob", "minimatch"],
    expectedMinimatchVersion: "9.0.9",
    expectedBraceExpansionVersion: "2.1.2",
  },
  "minimatch@10.2.5 (via eslint-config-next > typescript-eslint > @typescript-eslint/typescript-estree)":
    {
      chain: [
        "eslint-config-next",
        "typescript-eslint",
        "@typescript-eslint/typescript-estree",
        "minimatch",
      ],
      expectedMinimatchVersion: "10.2.5",
      expectedBraceExpansionVersion: "5.0.8",
    },
} satisfies Record<
  string,
  {
    chain: string[];
    expectedMinimatchVersion: string;
    expectedBraceExpansionVersion: string;
  }
>;

describe("brace-expansion override compatibility", () => {
  it.each(Object.entries(MINIMATCH_CONSUMERS))(
    "%s matches a brace-pattern glob using its actual installed brace-expansion",
    (_label, { chain, expectedMinimatchVersion, expectedBraceExpansionVersion }) => {
      const minimatchDir = resolveChain(chain);
      expect(readPackageJson(minimatchDir).version).toBe(expectedMinimatchVersion);

      const braceExpansionDir = resolvePackageDir(minimatchDir, "brace-expansion");
      expect(readPackageJson(braceExpansionDir).version).toBe(expectedBraceExpansionVersion);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const minimatchModule = require(minimatchDir);
      const match: (target: string, pattern: string) => boolean =
        minimatchModule.minimatch ?? minimatchModule;

      expect(match("foo.ts", "**/*.{ts,tsx}")).toBe(true);
    },
  );
});
