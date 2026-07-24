#!/usr/bin/env node
/**
 * Generates frontend/lib/api/generated/operations.ts from backend/openapi.json.
 *
 * Unlike openapi-typescript (which infers TypeScript shapes from the schema
 * itself), this script only extracts unambiguous, purely structural
 * metadata directly from the OpenAPI document: each operation's
 * operationId, HTTP method, path, and success status code. It never
 * attempts to independently resolve `$ref`s or guess a response shape —
 * the emitted functions reference openapi-typescript's own generated
 * `operations["<operationId>"]["responses"]["<code>"]["content"]["application/json"]`
 * type via TypeScript indexing, so response-type correctness is always
 * delegated to openapi-typescript, never re-derived here.
 *
 * Templated paths (e.g. "/api/v1/projects/{project_id}") work the same
 * way: the required path-parameter type is referenced via
 * `operations["<operationId>"]["parameters"]["path"]` rather than
 * reconstructed from the raw OpenAPI parameter list, so parameter typing
 * also stays entirely delegated to openapi-typescript. This script only
 * validates that the raw document's placeholders and declared path
 * parameters agree with each other before emitting code.
 *
 * All functions below are pure and exported so the generator's contract
 * validation and code-rendering logic can be unit tested directly, without
 * touching backend/openapi.json or spawning a subprocess.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Named `scriptDir` rather than `__dirname`: when this ESM file is
// transpiled to CommonJS (e.g. by Jest, to unit test the pure functions
// below), the CJS module wrapper already injects its own `__dirname`,
// which would collide with a redeclared `const __dirname`.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.resolve(scriptDir, "../../backend/openapi.json");
const OUTPUT_PATH = path.resolve(scriptDir, "../lib/api/generated/operations.ts");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
const SUCCESS_STATUS_PATTERN = /^2\d{2}$/;
const PATH_PLACEHOLDER_PATTERN = /\{([^}]*)\}/g;

export function toCamelCase(operationId) {
  return operationId.replace(/_([a-zA-Z0-9])/g, (_match, char) => char.toUpperCase());
}

/**
 * Extracts `{name}` placeholders from a path template, in template order.
 * Throws on an empty placeholder (`{}`) or a duplicate name — both make the
 * template ambiguous to interpolate against.
 */
export function extractPathPlaceholders(pathTemplate, operationId) {
  const names = [];
  const seen = new Set();
  let match;

  PATH_PLACEHOLDER_PATTERN.lastIndex = 0;
  while ((match = PATH_PLACEHOLDER_PATTERN.exec(pathTemplate)) !== null) {
    const name = match[1];
    if (!name) {
      throw new Error(
        `Operation ${operationId} path template "${pathTemplate}" contains an empty path placeholder.`,
      );
    }
    if (seen.has(name)) {
      throw new Error(
        `Operation ${operationId} path template "${pathTemplate}" contains duplicate placeholder "${name}".`,
      );
    }
    seen.add(name);
    names.push(name);
  }

  return names;
}

/**
 * Extracts the `in: "path"` parameters declared on an operation. Throws if
 * a declared path parameter is not marked `required: true` — OpenAPI
 * requires every path parameter to be required, so a document that says
 * otherwise is inconsistent and must not silently generate a helper that
 * treats the parameter as optional.
 */
export function collectDeclaredPathParameters(operation, operationId) {
  const parameters = operation.parameters ?? [];
  const seen = new Set();
  const names = [];

  for (const parameter of parameters) {
    if (parameter.in !== "path") {
      continue;
    }

    const { name } = parameter;
    if (seen.has(name)) {
      throw new Error(`Operation ${operationId} declares duplicate path parameter "${name}".`);
    }
    seen.add(name);

    if (parameter.required !== true) {
      throw new Error(
        `Operation ${operationId} declares path parameter "${name}" that is not marked required. ` +
          `OpenAPI path parameters must always be required.`,
      );
    }

    names.push(name);
  }

  return names;
}

/**
 * Cross-checks a path template's placeholders against an operation's
 * declared path parameters: every placeholder must have a matching
 * declared parameter, and every declared parameter must appear in the
 * template. Either direction failing means the contract is inconsistent
 * and no helper can be safely generated for it.
 */
export function validatePathParameterContract(operationId, placeholderNames, declaredNames) {
  const placeholderSet = new Set(placeholderNames);
  const declaredSet = new Set(declaredNames);

  for (const name of placeholderNames) {
    if (!declaredSet.has(name)) {
      throw new Error(
        `Operation ${operationId} path placeholder "${name}" has no declared path parameter.`,
      );
    }
  }

  for (const name of declaredNames) {
    if (!placeholderSet.has(name)) {
      throw new Error(
        `Operation ${operationId} declares path parameter "${name}" that is not present in the path template.`,
      );
    }
  }
}

export function collectOperations(openapi) {
  const operations = [];

  for (const [requestPath, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      const { operationId } = operation;
      if (!operationId) {
        throw new Error(
          `Cannot generate an operation for ${method.toUpperCase()} ${requestPath}: ` +
            `the OpenAPI document has no "operationId" for it.`,
        );
      }

      const responses = operation.responses ?? {};
      const successCodes = Object.keys(responses).filter((code) =>
        SUCCESS_STATUS_PATTERN.test(code),
      );
      if (successCodes.length !== 1) {
        throw new Error(
          `Cannot generate operation "${operationId}": expected exactly one 2xx response, ` +
            `found ${successCodes.length} (${successCodes.join(", ") || "none"}).`,
        );
      }
      const [successCode] = successCodes;

      const content = responses[successCode]?.content ?? {};
      if (!("application/json" in content)) {
        throw new Error(
          `Cannot generate operation "${operationId}": its ${successCode} response has no ` +
            `"application/json" content, so no response type can be referenced safely.`,
        );
      }

      const placeholderNames = extractPathPlaceholders(requestPath, operationId);
      const declaredPathParams = collectDeclaredPathParameters(operation, operationId);
      validatePathParameterContract(operationId, placeholderNames, declaredPathParams);

      operations.push({
        operationId,
        functionName: toCamelCase(operationId),
        method: method.toUpperCase(),
        path: requestPath,
        successCode,
        // Sorted so generated output never depends on the source
        // document's own parameter ordering.
        pathParamNames: [...placeholderNames].sort(),
      });
    }
  }

  // Deterministic regardless of the source document's own key order.
  operations.sort((a, b) => a.operationId.localeCompare(b.operationId));
  return operations;
}

function renderOperation({
  operationId,
  functionName,
  method,
  path: requestPath,
  successCode,
  pathParamNames,
}) {
  const responseType =
    `operations["${operationId}"]["responses"]["${successCode}"]` +
    `["content"]["application/json"]`;

  if (pathParamNames.length === 0) {
    return `export const ${functionName}Operation = {
  operationId: "${operationId}",
  method: "${method}",
  path: "${requestPath}",
} as const;

export async function ${functionName}<Options extends { method?: string } = { method?: string }>(
  request: ApiTransport<Options>,
  options?: Options,
): Promise<${responseType}> {
  // The caller's own options are spread first, then \`method\` is always
  // forced to this operation's declared method afterward, so a caller can
  // never override the contract's HTTP method through \`options\` — applied
  // uniformly for every operation, GET included, so generated metadata and
  // runtime execution can never disagree.
  const response = await request<${responseType}>(${functionName}Operation.path, {
    ...options,
    method: ${functionName}Operation.method,
  } as Options);
  return response.data;
}`;
  }

  const pathParamsType = `NonNullable<operations["${operationId}"]["parameters"]["path"]>`;

  return `export const ${functionName}Operation = {
  operationId: "${operationId}",
  method: "${method}",
  path: "${requestPath}",
} as const;

export async function ${functionName}<Options extends { method?: string } = { method?: string }>(
  request: ApiTransport<Options>,
  args: {
    path: ${pathParamsType};
    options?: Options;
  },
): Promise<${responseType}> {
  // Path parameters are interpolated into the runtime URL before the
  // request is made, so a caller can never send an unresolved
  // "{parameter}" placeholder or bypass validation of a required value.
  // The caller's own options are spread first, then \`method\` is always
  // forced to this operation's declared method afterward, applied
  // uniformly with every other generated operation.
  const resolvedPath = interpolatePath(${functionName}Operation.path, args.path);
  const response = await request<${responseType}>(resolvedPath, {
    ...args.options,
    method: ${functionName}Operation.method,
  } as Options);
  return response.data;
}`;
}

const INTERPOLATE_PATH_HELPER = `/**
 * Interpolates a templated OpenAPI path (e.g. "/api/v1/projects/{project_id}")
 * with the given parameter values. Every value is URL-encoded, a missing or
 * nullish value throws before any request is made, and no unresolved
 * "{parameter}" placeholder can ever reach the transport.
 */
export function interpolatePath(
  template: string,
  parameters: Record<string, string | number | boolean | null | undefined>,
): string {
  const resolved = template.replace(/\\{([^}]+)\\}/g, (_match, name: string) => {
    if (!(name in parameters)) {
      throw new Error(\`Missing required path parameter: "\${name}"\`);
    }
    const value = parameters[name];
    if (value === undefined || value === null) {
      throw new Error(\`Missing required path parameter: "\${name}"\`);
    }
    return encodeURIComponent(String(value));
  });

  const unresolved = resolved.match(/\\{[^}]*\\}/);
  if (unresolved) {
    throw new Error(\`Unresolved path parameter placeholder: "\${unresolved[0]}"\`);
  }

  return resolved;
}
`;

export function render(operations) {
  const body = operations.map(renderOperation).join("\n\n");
  const hasTemplatedOperations = operations.some((op) => op.pathParamNames.length > 0);

  return `/**
 * This file was auto-generated by frontend/scripts/generate-api-operations.mjs.
 * Do not make direct changes to the file.
 */

import type { operations } from "./schema";

/**
 * A request transport compatible with the existing \`apiRequest\` in
 * \`lib/api/client.ts\` and \`lib/api/server.ts\`: takes a path and options,
 * returns \`{ status, data }\`. \`Options\` is inferred from whichever concrete
 * transport is passed at the call site (\`RequestOptions\` for the browser
 * client, \`ServerRequestOptions\` for the server client), so this file never
 * imports or duplicates either of those interfaces.
 */
export type ApiTransport<Options extends { method?: string } = { method?: string }> = <T>(
  path: string,
  options?: Options,
) => Promise<{ status: number; data: T }>;
${hasTemplatedOperations ? `\n${INTERPOLATE_PATH_HELPER}` : ""}
${body}
`;
}

function main() {
  const openapi = JSON.parse(readFileSync(OPENAPI_PATH, "utf8"));
  const operations = collectOperations(openapi);
  const output = render(operations);

  writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} (${operations.length} operations)`);
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main();
}
