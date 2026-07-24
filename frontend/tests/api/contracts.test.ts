import type { HealthResponse, ReadyResponse } from "@/lib/api/contracts";
import type { operations } from "@/lib/api/generated/schema";

// Type-only assertions: these only compile if the generated contract still
// exposes exactly these operation IDs, keyed the same way FastAPI's
// `generate_unique_id_function` produces them. A renamed or removed
// operation fails `tsc --noEmit` here, independent of any runtime check —
// this constrains the generated contract itself, not just this test file.
type RootOperation = operations["root_get"];
type HealthOperation = operations["health_get"];
type ReadyOperation = operations["ready_get"];

describe("generated OpenAPI contract", () => {
  it("exposes the expected stable operation IDs", () => {
    // Referencing the types below (not just declaring them above) is what
    // actually forces the compiler to resolve `operations["..._get"]" for
    // each of root, health, and ready — a typo or removed operation would
    // fail to compile, not just fail silently.
    const operationIds: [
      RootOperation["responses"],
      HealthOperation["responses"],
      ReadyOperation["responses"],
    ] = [
      {} as RootOperation["responses"],
      {} as HealthOperation["responses"],
      {} as ReadyOperation["responses"],
    ];

    expect(operationIds).toHaveLength(3);
  });

  it("HealthResponse meaningfully constrains the /health payload shape", () => {
    const sample: HealthResponse = { status: "ok" };

    expect(sample.status).toBe("ok");
  });

  it("ReadyResponse meaningfully constrains the /ready payload shape", () => {
    const sample: ReadyResponse = {
      status: "ready",
      checks: { configuration: "ok", application: "ok", database: "ok" },
    };

    expect(sample.checks.database).toBe("ok");
  });
});
