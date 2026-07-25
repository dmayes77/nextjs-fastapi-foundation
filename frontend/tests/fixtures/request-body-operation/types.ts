/**
 * Compile-time coverage for generated request-body and path arguments.
 * This file is included by the frontend TypeScript build but intentionally
 * contains no Jest tests.
 */
import {
  healthGet,
  projectCreate,
  projectUpdate,
  type ApiTransport,
} from "./generated";

interface FixtureOptions {
  method?: string;
  body?: unknown;
  requestId?: string;
}

declare const transport: ApiTransport<FixtureOptions>;

// Bodyless operation signatures remain unchanged.
void healthGet(transport);
void healthGet(transport, { requestId: "health-1" });

// @ts-expect-error a required request body cannot be omitted.
void projectCreate(transport);

// @ts-expect-error ProjectCreate requires a string name.
void projectCreate(transport, {});

// @ts-expect-error ProjectCreate rejects an invalid name shape.
void projectCreate(transport, { name: 42 });

void projectCreate(transport, { name: "Typed create", status: "active" });
void projectCreate(
  transport,
  { name: "Typed create" },
  { requestId: "create-1" },
);

// @ts-expect-error args are required for a templated operation.
void projectUpdate(transport);

// @ts-expect-error a required request body cannot be omitted from args.
void projectUpdate(transport, { path: { project_id: "project-1" } });

void projectUpdate(transport, {
  path: {
    // @ts-expect-error the required path parameter must use its declared name.
    wrong_name: "project-1",
  },
  body: {},
});

void projectUpdate(transport, {
  path: { project_id: "project-1" },
  body: {
    // @ts-expect-error ProjectUpdate name must be a string when supplied.
    name: 42,
  },
});

void projectUpdate(transport, {
  path: { project_id: "project-1" },
  body: { description: null },
});
void projectUpdate(transport, {
  path: { project_id: "project-1" },
  body: { name: "Typed update" },
  options: { requestId: "update-1" },
});
