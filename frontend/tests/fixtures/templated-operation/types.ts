/**
 * Compile-time-only proof that a templated generated operation requires
 * its path parameters at the type level, not only at runtime. This file is
 * intentionally not named `*.test.ts`: it has no `it()`/`describe()` blocks
 * for Jest to run, but it still participates in `tsc --noEmit` via
 * tsconfig.json's `"**\/*.ts"` include pattern, so a regression here (e.g.
 * `args.path` accidentally becoming optional) fails the TypeScript check
 * even though no runtime test would ever catch it.
 */
import { projectGet, type ApiTransport } from "./generated";

declare const transport: ApiTransport<{ method?: string; requestId?: string }>;

// @ts-expect-error calling a templated operation with no args at all must
// fail to compile: `args` is required, not optional.
void projectGet(transport);

// @ts-expect-error `args.path` is required and must not be omitted.
void projectGet(transport, {});

// @ts-expect-error `args.path` must be provided even if `options` is.
void projectGet(transport, { options: {} });

// @ts-expect-error the path-parameter object must use the OpenAPI
// document's own declared name ("project_id"), not an arbitrary key.
void projectGet(transport, { path: { wrong_name: "abc-123" } });

// Compiles: every required path parameter is present, by its exact name.
void projectGet(transport, { path: { project_id: "abc-123" } });

// Compiles: `options` may additionally be supplied alongside `path`.
void projectGet(transport, {
  path: { project_id: "abc-123" },
  options: { requestId: "req-1" },
});
