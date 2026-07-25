/**
 * @jest-environment node
 *
 * Node environment (not jsdom) so `global.fetch` — used below to prove no
 * generated operation calls it directly — actually exists to spy on.
 */
import {
  healthGet,
  healthGetOperation,
  interpolatePath,
  projectsArchiveOperation,
  projectsCreateOperation,
  projectsGet,
  projectsGetOperation,
  projectsListOperation,
  projectsUpdateOperation,
  readyGetOperation,
  rootGetOperation,
  type ApiTransport,
} from "@/lib/api/generated/operations";

// Mirrors the shape of `ServerRequestOptions` (`lib/api/server.ts`) without
// importing it, since a generated operation's transport parameter must work
// with *any* compatible options shape, not just that one concrete type.
interface TestTransportOptions {
  method?: string;
  headers?: HeadersInit;
  requestId?: string;
}

function mockTransport(): jest.MockedFunction<ApiTransport<TestTransportOptions>> {
  return jest.fn().mockResolvedValue({ status: 200, data: { status: "ok" } });
}

describe("generated API operation metadata", () => {
  it("exposes stable operation IDs, methods, and paths for every operation", () => {
    expect(rootGetOperation).toEqual({ operationId: "root_get", method: "GET", path: "/" });
    expect(healthGetOperation).toEqual({
      operationId: "health_get",
      method: "GET",
      path: "/health",
    });
    expect(readyGetOperation).toEqual({
      operationId: "ready_get",
      method: "GET",
      path: "/ready",
    });
    expect(projectsListOperation).toEqual({
      operationId: "projects_list",
      method: "GET",
      path: "/api/v1/projects",
    });
    expect(projectsCreateOperation).toEqual({
      operationId: "projects_create",
      method: "POST",
      path: "/api/v1/projects",
    });
    expect(projectsGetOperation).toEqual({
      operationId: "projects_get",
      method: "GET",
      path: "/api/v1/projects/{project_id}",
    });
    expect(projectsUpdateOperation).toEqual({
      operationId: "projects_update",
      method: "PATCH",
      path: "/api/v1/projects/{project_id}",
    });
    expect(projectsArchiveOperation).toEqual({
      operationId: "projects_archive",
      method: "POST",
      path: "/api/v1/projects/{project_id}/archive",
    });
  });
});

describe("healthGet", () => {
  it("delegates to the supplied transport exactly once, with the operation's path", async () => {
    const transport = mockTransport();

    await healthGet(transport, { requestId: "req-1" });

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe("/health");
  });

  it("preserves unrelated caller options while forcing the generated method", async () => {
    const transport = mockTransport();
    const options = { requestId: "req-2", headers: { "X-Test": "1" } };

    await healthGet(transport, options);

    const [, forwardedOptions] = transport.mock.calls[0];
    // A new object, not the original reference: `method` is always merged
    // in, so every other option must still be checked individually rather
    // than relying on reference equality to the caller's own object.
    expect(forwardedOptions).toEqual({ ...options, method: "GET" });
  });

  it("works with no options argument at all, still forcing the generated method", async () => {
    const transport = mockTransport();

    await healthGet(transport);

    expect(transport).toHaveBeenCalledWith("/health", { method: "GET" });
  });

  it("regression: a caller cannot override the generated method, e.g. to POST", async () => {
    const transport = mockTransport();

    const result = await healthGet(transport, { method: "POST", requestId: "request-123" });

    expect(transport).toHaveBeenCalledTimes(1);
    const [calledPath, calledOptions] = transport.mock.calls[0];
    expect(calledPath).toBe("/health");
    expect(calledOptions).toEqual({ method: "GET", requestId: "request-123" });
    expect(result).toEqual({ status: "ok" });

    // Generated metadata and runtime execution must agree.
    expect(healthGetOperation).toEqual({
      operationId: "health_get",
      method: "GET",
      path: "/health",
    });
  });

  it("returns the transport's response data, not the full { status, data } envelope", async () => {
    const transport = mockTransport();

    const result = await healthGet(transport, {});

    expect(result).toEqual({ status: "ok" });
  });

  it("never calls the global fetch implementation directly", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
      throw new Error("a generated operation must never call fetch() directly");
    });

    try {
      await healthGet(mockTransport(), {});
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("interpolatePath", () => {
  it("interpolates a plain value into the template", () => {
    expect(interpolatePath("/api/v1/projects/{project_id}", { project_id: "abc-123" })).toBe(
      "/api/v1/projects/abc-123",
    );
  });

  it("URL-encodes a value containing reserved characters", () => {
    expect(interpolatePath("/api/v1/projects/{project_id}", { project_id: "a/b c" })).toBe(
      "/api/v1/projects/a%2Fb%20c",
    );
  });

  it("preserves numeric zero rather than treating it as missing", () => {
    expect(interpolatePath("/api/v1/projects/{project_id}", { project_id: 0 })).toBe(
      "/api/v1/projects/0",
    );
  });

  it("preserves false rather than treating it as missing", () => {
    expect(interpolatePath("/x/{flag}", { flag: false })).toBe("/x/false");
  });

  it("throws when a required parameter is entirely missing from the object", () => {
    expect(() => interpolatePath("/api/v1/projects/{project_id}", {})).toThrow(
      'Missing required path parameter: "project_id"',
    );
  });

  it("throws when a required parameter is undefined", () => {
    expect(() =>
      interpolatePath("/api/v1/projects/{project_id}", { project_id: undefined }),
    ).toThrow('Missing required path parameter: "project_id"');
  });

  it("throws when a required parameter is null", () => {
    expect(() =>
      interpolatePath("/api/v1/projects/{project_id}", {
        project_id: null as unknown as string,
      }),
    ).toThrow('Missing required path parameter: "project_id"');
  });

  it("throws when a placeholder has no corresponding entry, leaving it unresolved", () => {
    expect(() => interpolatePath("/x/{a}/{b}", { a: "1" })).toThrow(
      'Missing required path parameter: "b"',
    );
  });

  it("does not mutate the caller's parameters object", () => {
    const parameters = { project_id: "abc-123" };
    const snapshot = { ...parameters };

    interpolatePath("/api/v1/projects/{project_id}", parameters);

    expect(parameters).toEqual(snapshot);
  });
});

function mockProjectTransport(): jest.MockedFunction<ApiTransport<TestTransportOptions>> {
  return jest.fn().mockResolvedValue({ status: 200, data: { id: "proj-1" } });
}

describe("projectsGet", () => {
  it("is a callable generated function that resolves with the transport's response data", async () => {
    const transport = mockProjectTransport();

    const result = await projectsGet(transport, { path: { project_id: "abc-123" } });

    expect(result).toEqual({ id: "proj-1" });
  });

  it("retains the original operation ID, method, and path template in its metadata", () => {
    expect(projectsGetOperation).toEqual({
      operationId: "projects_get",
      method: "GET",
      path: "/api/v1/projects/{project_id}",
    });
  });

  it("interpolates the path parameter into the URL passed to the transport", async () => {
    const transport = mockProjectTransport();

    await projectsGet(transport, { path: { project_id: "abc-123" } });

    const [calledPath] = transport.mock.calls[0];
    expect(calledPath).toBe("/api/v1/projects/abc-123");
    expect(calledPath).not.toMatch(/[{}]/);
  });

  it("forces the generated method to GET even when the caller supplies POST", async () => {
    const transport = mockProjectTransport();

    await projectsGet(transport, {
      path: { project_id: "abc-123" },
      options: { method: "POST", requestId: "request-456" },
    });

    const [, calledOptions] = transport.mock.calls[0];
    expect(calledOptions).toEqual({ method: "GET", requestId: "request-456" });
  });

  it("preserves unrelated caller options alongside the forced method", async () => {
    const transport = mockProjectTransport();

    await projectsGet(transport, {
      path: { project_id: "abc-123" },
      options: { requestId: "request-789", headers: { "X-Test": "1" } },
    });

    const [, calledOptions] = transport.mock.calls[0];
    expect(calledOptions).toEqual({
      method: "GET",
      requestId: "request-789",
      headers: { "X-Test": "1" },
    });
  });

  it("never calls the transport when a required path parameter is missing", async () => {
    const transport = mockProjectTransport();

    await expect(
      projectsGet(transport, { path: {} as unknown as { project_id: string } }),
    ).rejects.toThrow('Missing required path parameter: "project_id"');

    expect(transport).not.toHaveBeenCalled();
  });

  it("never calls the transport when the path parameter is null via an unsafe cast", async () => {
    const transport = mockProjectTransport();

    await expect(
      projectsGet(transport, {
        path: { project_id: null as unknown as string },
      }),
    ).rejects.toThrow('Missing required path parameter: "project_id"');

    expect(transport).not.toHaveBeenCalled();
  });
});
