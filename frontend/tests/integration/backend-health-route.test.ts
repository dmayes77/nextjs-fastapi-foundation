/**
 * @jest-environment node
 *
 * Uses the node environment (not jsdom) because this suite constructs and
 * reads native `Request`/`Response` objects directly. Step 15's own tests
 * already cover `fetch()` and transport behavior; this suite mocks the
 * server API client boundary (`@/lib/api/server`) so it stays focused on
 * route orchestration — request ID selection and error-to-response mapping
 * — without depending on fetch, `serverEnv`, or any real network behavior.
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/backend/health/route";
import { apiRequest } from "@/lib/api/server";
import { APIError, NetworkError, TimeoutError } from "@/lib/api/shared";

jest.mock("@/lib/api/server", () => ({
  apiRequest: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildRequest(headers?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/backend/health", { headers });
}

describe("GET /api/backend/health", () => {
  afterEach(() => {
    mockedApiRequest.mockReset();
  });

  it("1. succeeds with a generated request ID when none is sent", async () => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    const response = await GET(buildRequest());
    const body = await response.json();

    const [path, options] = mockedApiRequest.mock.calls[0];
    expect(path).toBe("/health");
    expect(options?.requestId).toMatch(UUID_PATTERN);

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(response.headers.get("X-Request-ID")).toBe(options?.requestId);
  });

  it("2. preserves a valid incoming request ID and forwards it to apiRequest()", async () => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    const response = await GET(buildRequest({ "X-Request-ID": "incoming-request-id" }));

    // healthGet() always forces `method: "GET"` (its generated method) onto
    // whatever options it's given, so the forwarded call includes it too.
    expect(mockedApiRequest).toHaveBeenCalledWith("/health", {
      requestId: "incoming-request-id",
      method: "GET",
    });
    expect(response.headers.get("X-Request-ID")).toBe("incoming-request-id");
  });

  it("3. maps a network failure to 503 with the centralized safe message", async () => {
    mockedApiRequest.mockRejectedValueOnce(new NetworkError("Unable to reach the server.", {}));

    const response = await GET(buildRequest({ "X-Request-ID": "network-failure-id" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "network_error",
        message: "Unable to connect to the server.",
        details: null,
        requestId: "network-failure-id",
      },
    });
    expect(response.headers.get("X-Request-ID")).toBe("network-failure-id");
  });

  it("4. maps a timeout failure to 503 with the centralized safe message", async () => {
    mockedApiRequest.mockRejectedValueOnce(new TimeoutError());

    const response = await GET(buildRequest({ "X-Request-ID": "timeout-id" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "request_timeout",
        message: "The request took too long. Please try again.",
        details: null,
        requestId: "timeout-id",
      },
    });
    expect(response.headers.get("X-Request-ID")).toBe("timeout-id");
  });

  it("5. preserves the backend's status, code, message, details, and request ID in the body, while X-Request-ID stays this route's own", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new APIError("Database is unavailable", 503, {
        error: {
          code: "database_unavailable",
          message: "Database is unavailable",
          details: null,
          requestId: "backend-request-id",
        },
      }),
    );

    const response = await GET(buildRequest({ "X-Request-ID": "route-level-id" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "database_unavailable",
        message: "Database is unavailable",
        details: null,
        requestId: "backend-request-id",
      },
    });
    // Deliberate: the response header always carries this route's own
    // selected request ID (correlating the HTTP exchange itself), while the
    // JSON envelope's `requestId` carries the backend's own — the two
    // identify different things and are not merged.
    expect(response.headers.get("X-Request-ID")).toBe("route-level-id");
  });

  it("6. maps an unexpected error to 500 with a generic message and no leaked detail", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("sensitive internal failure"));

    const response = await GET(buildRequest({ "X-Request-ID": "unexpected-id" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "unexpected_error",
        message: "Something went wrong.",
        details: null,
        requestId: "unexpected-id",
      },
    });
    expect(response.headers.get("X-Request-ID")).toBe("unexpected-id");
  });

  it("7. generates a fresh request ID when the incoming header is whitespace-only", async () => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    const response = await GET(buildRequest({ "X-Request-ID": "   " }));

    const [, options] = mockedApiRequest.mock.calls[0];
    expect(options?.requestId).toMatch(UUID_PATTERN);
    expect(response.headers.get("X-Request-ID")).toBe(options?.requestId);
  });

  it("8. generates a fresh request ID when the incoming header exceeds the length limit", async () => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    const response = await GET(buildRequest({ "X-Request-ID": "a".repeat(129) }));

    const [, options] = mockedApiRequest.mock.calls[0];
    expect(options?.requestId).toMatch(UUID_PATTERN);
    expect(response.headers.get("X-Request-ID")).toBe(options?.requestId);
  });

  // Mirrors backend/app/middleware/request_id.py's exact allowlist
  // (A-Z, a-z, 0-9, -, _, .) so a value this route preserves is guaranteed
  // to be one FastAPI also preserves — otherwise the response header and
  // FastAPI's own logs would correlate two different IDs.
  it.each([
    "request-123",
    "request_123",
    "request.123",
    "ABC-xyz_123.test",
  ])("9. preserves the backend-valid request ID %j unchanged", async (validId) => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    const response = await GET(buildRequest({ "X-Request-ID": validId }));

    // healthGet() always forces `method: "GET"` (its generated method) onto
    // whatever options it's given, so the forwarded call includes it too.
    expect(mockedApiRequest).toHaveBeenCalledWith("/health", { requestId: validId, method: "GET" });
    expect(response.headers.get("X-Request-ID")).toBe(validId);
  });

  it("10. rejects a space-containing request ID and generates a UUID instead", async () => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    const response = await GET(buildRequest({ "X-Request-ID": "request id with spaces" }));

    const [, options] = mockedApiRequest.mock.calls[0];
    expect(options?.requestId).not.toBe("request id with spaces");
    expect(options?.requestId).toMatch(UUID_PATTERN);
    expect(response.headers.get("X-Request-ID")).toBe(options?.requestId);
  });

  it.each(["request/id", "request:id"])(
    "11. rejects a request ID containing disallowed punctuation (%s) and generates a UUID instead",
    async (invalidId) => {
      mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

      const response = await GET(buildRequest({ "X-Request-ID": invalidId }));

      const [, options] = mockedApiRequest.mock.calls[0];
      expect(options?.requestId).not.toBe(invalidId);
      expect(options?.requestId).toMatch(UUID_PATTERN);
      expect(response.headers.get("X-Request-ID")).toBe(options?.requestId);
    },
  );

  it("12. never forwards a raw upstream response body when FastAPI's response is not a structured error envelope", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new APIError(
        "Request failed with status 502.",
        502,
        "<html><body>Bad Gateway - internal debug trace</body></html>",
      ),
    );

    const response = await GET(buildRequest({ "X-Request-ID": "raw-body-id" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: {
        code: "http_error",
        message: "Request failed with status 502.",
        details: null,
        requestId: "raw-body-id",
      },
    });
    expect(JSON.stringify(body)).not.toContain("Bad Gateway");
  });

  it("13. still preserves genuine backend-provided details from a real structured error envelope", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new APIError("Validation failed", 422, {
        error: {
          code: "validation_error",
          message: "Validation failed",
          details: { field: "status", reason: "missing" },
          requestId: "backend-validation-id",
        },
      }),
    );

    const response = await GET(buildRequest({ "X-Request-ID": "validation-request-id" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.details).toEqual({ field: "status", reason: "missing" });
  });
});
