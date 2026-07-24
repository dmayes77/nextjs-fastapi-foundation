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
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.resolve(__dirname, "../../backend/openapi.json");
const OUTPUT_PATH = path.resolve(__dirname, "../lib/api/generated/operations.ts");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
const SUCCESS_STATUS_PATTERN = /^2\d{2}$/;
// Matches the default in frontend/lib/api/shared.ts's `request()`
// (`const { method = "GET", ... } = options`), so a GET operation never
// needs to inject a redundant `method` into the call.
const TRANSPORT_DEFAULT_METHOD = "GET";

function toCamelCase(operationId) {
  return operationId.replace(/_([a-zA-Z0-9])/g, (_match, char) => char.toUpperCase());
}

function collectOperations(openapi) {
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

      operations.push({
        operationId,
        functionName: toCamelCase(operationId),
        method: method.toUpperCase(),
        path: requestPath,
        successCode,
      });
    }
  }

  // Deterministic regardless of the source document's own key order.
  operations.sort((a, b) => a.operationId.localeCompare(b.operationId));
  return operations;
}

function renderOperation({ operationId, functionName, method, path: requestPath, successCode }) {
  const responseType =
    `operations["${operationId}"]["responses"]["${successCode}"]` +
    `["content"]["application/json"]`;

  // The metadata object below always states the method explicitly (and is
  // asserted on directly in tests), independent of whether the call itself
  // needs to pass `method` through: the shared transport already defaults
  // to GET, so a GET operation forwards `options` completely unchanged
  // rather than injecting a redundant, test-breaking `method: "GET"`. Any
  // non-GET operation must still pass its method explicitly, since the
  // transport would otherwise silently default to GET.
  const isDefaultMethod = method === TRANSPORT_DEFAULT_METHOD;
  const callOptionsExpr = isDefaultMethod
    ? "options"
    : `{\n    ...options,\n    method: ${functionName}Operation.method,\n  } as Options`;
  const methodComment = isDefaultMethod
    ? `  // The shared transport already defaults to GET (this operation's\n  // declared method), so \`options\` is forwarded to it unchanged.\n`
    : `  // The caller's own options are spread first, then \`method\` is always\n  // forced to this operation's declared method, so a caller can never\n  // override the contract's HTTP method through \`options\`.\n`;

  return `export const ${functionName}Operation = {
  operationId: "${operationId}",
  method: "${method}",
  path: "${requestPath}",
} as const;

export async function ${functionName}<Options extends { method?: string } = { method?: string }>(
  request: ApiTransport<Options>,
  options?: Options,
): Promise<${responseType}> {
${methodComment}  const response = await request<${responseType}>(${functionName}Operation.path, ${callOptionsExpr});
  return response.data;
}`;
}

function render(operations) {
  const body = operations.map(renderOperation).join("\n\n");

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

main();
