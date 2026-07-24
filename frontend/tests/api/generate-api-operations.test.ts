/**
 * Tests the generator itself (frontend/scripts/generate-api-operations.mjs)
 * against small, purely in-memory OpenAPI documents — never against
 * backend/openapi.json. Runtime behavior of generated templated operations
 * (interpolation, method enforcement, transport delegation) is covered
 * separately in generated-operations.test.ts, against the committed
 * fixture pair in tests/fixtures/templated-operation/.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  collectOperations,
  render,
  toCamelCase,
} from "../../scripts/generate-api-operations.mjs";

/**
 * A deliberately loose type for the plain-JS-object OpenAPI documents these
 * tests build: the generator itself (an untyped .mjs script) only reads
 * structural shape at runtime, so these types exist purely to let the
 * tests mutate arbitrary path keys and parameters without fighting a
 * narrower, literal-inferred object type.
 */
interface OpenApiParameter {
  name: string;
  in: string;
  required: boolean;
  schema?: Record<string, unknown>;
}

interface OpenApiOperation {
  operationId: string;
  parameters?: OpenApiParameter[];
  responses: Record<string, unknown>;
}

interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: Record<string, unknown>;
}

/**
 * The exact OpenAPI document used to produce the committed fixture pair at
 * tests/fixtures/templated-operation/{schema,generated}.ts. Kept in sync by
 * the "matches the committed fixture" test below: if this fixture or the
 * generator's templated-operation output ever drift apart, that test fails
 * and both must be regenerated together.
 */
function buildTemplatedFixtureOpenapi(): OpenApiDocument {
  return {
    openapi: "3.1.0",
    info: { title: "Probe", version: "0.1.0" },
    paths: {
      "/api/v1/projects/{project_id}": {
        get: {
          operationId: "project_get",
          parameters: [
            {
              name: "project_id",
              in: "path",
              required: true,
              schema: { type: "string", title: "Project Id" },
            },
          ],
          responses: {
            "200": {
              description: "Successful Response",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProjectResponse" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ProjectResponse: {
          type: "object",
          title: "ProjectResponse",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
  };
}

function buildStaticFixtureOpenapi(): OpenApiDocument {
  return {
    openapi: "3.1.0",
    info: { title: "Probe", version: "0.1.0" },
    paths: {
      "/health": {
        get: {
          operationId: "health_get",
          responses: {
            "200": {
              description: "Successful Response",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
  };
}

describe("toCamelCase", () => {
  it("converts a snake_case operationId to camelCase", () => {
    expect(toCamelCase("project_get")).toBe("projectGet");
    expect(toCamelCase("health_get")).toBe("healthGet");
  });
});

describe("collectOperations: static operations", () => {
  it("produces no path-parameter args for an operation with no path parameters", () => {
    const [operation] = collectOperations(buildStaticFixtureOpenapi());

    expect(operation).toMatchObject({
      operationId: "health_get",
      functionName: "healthGet",
      method: "GET",
      path: "/health",
      pathParamNames: [],
    });
  });
});

describe("collectOperations: templated operations", () => {
  it("extracts the declared path parameter for a templated path", () => {
    const [operation] = collectOperations(buildTemplatedFixtureOpenapi());

    expect(operation).toMatchObject({
      operationId: "project_get",
      functionName: "projectGet",
      method: "GET",
      path: "/api/v1/projects/{project_id}",
      pathParamNames: ["project_id"],
    });
  });
});

describe("generator contract validation", () => {
  it("rejects a path placeholder with no matching declared path parameter", () => {
    const openapi = buildTemplatedFixtureOpenapi();
    openapi.paths["/api/v1/projects/{project_id}"].get.parameters = [];

    expect(() => collectOperations(openapi)).toThrow(
      'Operation project_get path placeholder "project_id" has no declared path parameter.',
    );
  });

  it("rejects a declared path parameter that is not present in the path template", () => {
    const openapi = buildTemplatedFixtureOpenapi();
    const operation = openapi.paths["/api/v1/projects/{project_id}"].get;
    delete openapi.paths["/api/v1/projects/{project_id}"];
    openapi.paths["/api/v1/projects"] = { get: operation };

    expect(() => collectOperations(openapi)).toThrow(
      'Operation project_get declares path parameter "project_id" that is not present in the path template.',
    );
  });

  it("rejects a declared path parameter that is not marked required", () => {
    const openapi = buildTemplatedFixtureOpenapi();
    const parameters = openapi.paths["/api/v1/projects/{project_id}"].get.parameters;
    if (!parameters) {
      throw new Error("fixture is missing its declared path parameters");
    }
    parameters[0].required = false;

    expect(() => collectOperations(openapi)).toThrow(
      'Operation project_get declares path parameter "project_id" that is not marked required. ' +
        "OpenAPI path parameters must always be required.",
    );
  });

  it("rejects an empty path placeholder", () => {
    const openapi = buildTemplatedFixtureOpenapi();
    const operation = openapi.paths["/api/v1/projects/{project_id}"].get;
    delete openapi.paths["/api/v1/projects/{project_id}"];
    openapi.paths["/api/v1/projects/{}"] = { get: operation };

    expect(() => collectOperations(openapi)).toThrow(
      'Operation project_get path template "/api/v1/projects/{}" contains an empty path placeholder.',
    );
  });

  it("rejects a duplicate placeholder name in the same path template", () => {
    const openapi = buildTemplatedFixtureOpenapi();
    const operation = openapi.paths["/api/v1/projects/{project_id}"].get;
    const [firstParameter] = operation.parameters ?? [];
    if (!firstParameter) {
      throw new Error("fixture is missing its declared path parameters");
    }
    operation.parameters = [firstParameter, { ...firstParameter }];
    delete openapi.paths["/api/v1/projects/{project_id}"];
    openapi.paths["/api/v1/projects/{project_id}/{project_id}"] = { get: operation };

    expect(() => collectOperations(openapi)).toThrow(
      'Operation project_get path template "/api/v1/projects/{project_id}/{project_id}" contains duplicate placeholder "project_id".',
    );
  });
});

describe("determinism", () => {
  it("produces byte-identical output across repeated generation of the same in-memory document", () => {
    const openapi = buildTemplatedFixtureOpenapi();

    const first = render(collectOperations(openapi));
    const second = render(collectOperations(JSON.parse(JSON.stringify(openapi))));

    expect(first).toBe(second);
  });

  it("produces byte-identical output regardless of the source document's key order", () => {
    const openapi = buildTemplatedFixtureOpenapi();
    const reordered = {
      components: openapi.components,
      paths: openapi.paths,
      info: openapi.info,
      openapi: openapi.openapi,
    };

    expect(render(collectOperations(openapi))).toBe(render(collectOperations(reordered)));
  });
});

describe("committed templated-operation fixture", () => {
  it("matches the generator's current output exactly, so the fixture never silently drifts from the generator", () => {
    const generated = render(collectOperations(buildTemplatedFixtureOpenapi()));
    const committed = readFileSync(
      path.resolve(__dirname, "../fixtures/templated-operation/generated.ts"),
      "utf8",
    );

    expect(generated).toBe(committed);
  });
});
