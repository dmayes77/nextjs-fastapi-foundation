/**
 * Compile-time coverage for the actual generated Project operations.
 * This file is included by TypeScript but intentionally contains no Jest
 * test blocks.
 */
import {
  projectsCreate,
  projectsUpdate,
  type ApiTransport,
} from "@/lib/api/generated/operations";

interface ProjectOperationOptions {
  method?: string;
  body?: unknown;
}

declare const transport: ApiTransport<ProjectOperationOptions>;

// Compiles: the backend default makes status optional.
void projectsCreate(transport, { name: "New project" });

// Compiles: callers may still provide a valid status explicitly.
void projectsCreate(transport, {
  name: "New project",
  status: "active",
});

// @ts-expect-error ProjectCreate requires name.
void projectsCreate(transport, {});

void projectsCreate(transport, {
  name: "New project",
  // @ts-expect-error status must be a generated ProjectStatus value.
  status: "invalid-status",
});

void projectsCreate(transport, {
  // @ts-expect-error name must be a string.
  name: 123,
});

// The update operation continues to require both its typed path and body.
void projectsUpdate(transport, {
  path: { project_id: "project-1" },
  body: { description: null },
});

// @ts-expect-error ProjectUpdate body remains required.
void projectsUpdate(transport, {
  path: { project_id: "project-1" },
});
