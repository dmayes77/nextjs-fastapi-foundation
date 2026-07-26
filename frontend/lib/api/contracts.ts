import type { components } from "./generated/schema";
import {
  healthGet,
  projectsArchive,
  projectsCreate,
  projectsGet,
  projectsList,
  projectsUpdate,
} from "./generated/operations";

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
export type ProjectCreate = components["schemas"]["ProjectCreate"];
export type ProjectResponse = components["schemas"]["ProjectResponse"];
export type ProjectStatus = components["schemas"]["ProjectStatus"];
export type ProjectUpdate = components["schemas"]["ProjectUpdate"];

export {
  healthGet,
  projectsArchive,
  projectsCreate,
  projectsGet,
  projectsList,
  projectsUpdate,
};
