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

  it("forwards request options unchanged, since GET is already the shared transport's default method", async () => {
    const transport = mockTransport();
    const options = { requestId: "req-2", headers: { "X-Test": "1" } };

    await healthGet(transport, options);

    const [, forwardedOptions] = transport.mock.calls[0];
    expect(forwardedOptions).toBe(options);
  });

  it("works with no options argument at all", async () => {
    const transport = mockTransport();

    await healthGet(transport);

    expect(transport).toHaveBeenCalledWith("/health", undefined);
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
