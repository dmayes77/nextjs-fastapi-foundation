import type { components } from "./generated/schema";

/**
 * Stable, named re-exports of generated FastAPI response contracts.
 *
 * Feature code imports from here instead of `./generated/schema` directly,
 * so the deeply nested generated shape (`components["schemas"][...]`) never
 * leaks into call sites, and regenerating with a different tool or config
 * only requires updating this one file.
 */
export type HealthResponse = components["schemas"]["HealthResponse"];
export type ReadyResponse = components["schemas"]["ReadyResponse"];
