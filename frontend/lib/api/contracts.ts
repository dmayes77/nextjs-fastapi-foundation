import type { components } from "./generated/schema";
import { healthGet } from "./generated/operations";

/**
 * Stable, named re-exports of generated FastAPI response contracts.
 *
 * Feature code imports from here instead of `./generated/schema` or
 * `./generated/operations` directly, so the deeply nested generated shape
 * (`components["schemas"][...]`) and the generated file layout never leak
 * into call sites, and regenerating with a different tool or config only
 * requires updating this one file. Only currently-consumed operations are
 * re-exported here — not every generated operation.
 */
export type HealthResponse = components["schemas"]["HealthResponse"];
export type ReadyResponse = components["schemas"]["ReadyResponse"];

export { healthGet };
