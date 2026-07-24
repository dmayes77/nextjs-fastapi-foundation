/**
 * This is the real, unmodified output of `openapi-typescript` run against a
 * small fixture OpenAPI document containing a single templated-path
 * operation (`GET /api/v1/projects/{project_id}`, operationId
 * `project_get`) — captured once and committed here so `./generated.ts`
 * and its tests have a concrete, verified example of how openapi-typescript
 * actually shapes a required path parameter
 * (`operations["project_get"]["parameters"]["path"]`), without needing a
 * real backend Project route or a permanent OpenAPI JSON fixture.
 *
 * This directory mirrors the real `lib/api/generated/` layout (a
 * `schema.ts` alongside a `generated.ts` that imports `./schema`) so
 * `generated.ts` can be an exact, unmodified copy of the real generator's
 * output for this fixture, exactly as it would be written by
 * `pnpm api:generate` if the real OpenAPI contract ever gained a templated
 * operation like this one.
 */

export interface paths {
  "/api/v1/projects/{project_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["project_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /** ProjectResponse */
    ProjectResponse: {
      id: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  project_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        project_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectResponse"];
        };
      };
    };
  };
}
