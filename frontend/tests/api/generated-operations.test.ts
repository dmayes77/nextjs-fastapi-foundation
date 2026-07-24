/**
 * @jest-environment node
 *
 * Node environment (not jsdom) so `global.fetch` — used below to prove no
 * generated operation calls it directly — actually exists to spy on.
 */
import {
  healthGet,
  healthGetOperation,
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
