import { APIError, InvalidPathError, NetworkError, TimeoutError } from "@/lib/api/shared";
import { normalizeError } from "@/lib/errors/normalize";

describe("normalizeError with APIError", () => {
  it("prefers a valid FastAPI error envelope", () => {
    const error = new APIError("Request failed with status 404.", 404, {
      error: {
        code: "resource_not_found",
        message: "Resource not found",
        details: { field: "id" },
        requestId: "req-abc-123",
      },
    });

    expect(normalizeError(error)).toEqual({
      code: "resource_not_found",
      message: "Resource not found",
      status: 404,
      details: { field: "id" },
      requestId: "req-abc-123",
      retryable: false,
    });
  });

  it("falls back to generic code and message for a plain-text body", () => {
    const error = new APIError("Request failed with status 502.", 502, "Bad Gateway");

    const result = normalizeError(error);

    expect(result.code).toBe("http_error");
    expect(result.message).toBe("Request failed with status 502.");
    expect(result.details).toBe("Bad Gateway");
    expect(result.requestId).toBeNull();
    expect(result.retryable).toBe(true);
  });

  it("falls back safely when there are no details", () => {
    const error = new APIError("Request failed with status 400.", 400);

    const result = normalizeError(error);

    expect(result.code).toBe("http_error");
    expect(result.message).toBe("Request failed with status 400.");
    expect(result.details).toBeNull();
    expect(result.requestId).toBeNull();
    expect(result.retryable).toBe(false);
  });

  it("ignores an envelope whose fields are not the expected string type", () => {
    const error = new APIError("Request failed with status 400.", 400, {
      error: { code: 123, message: true, details: "bad shape", requestId: [] },
    });

    const result = normalizeError(error);

    expect(result.code).toBe("http_error");
    expect(result.message).toBe("Request failed with status 400.");
    expect(result.requestId).toBeNull();
  });

  it("preserves a null envelope details field instead of falling back", () => {
    const error = new APIError("Request failed with status 404.", 404, {
      error: { code: "not_found", message: "Not found", details: null, requestId: "req-1" },
    });

    expect(normalizeError(error).details).toBeNull();
  });

  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  const nonRetryableStatuses = [400, 401, 403, 404, 409, 422];

  retryableStatuses.forEach((status) => {
    it(`marks status ${status} as retryable`, () => {
      expect(normalizeError(new APIError("x", status)).retryable).toBe(true);
    });
  });

  nonRetryableStatuses.forEach((status) => {
    it(`marks status ${status} as not retryable`, () => {
      expect(normalizeError(new APIError("x", status)).retryable).toBe(false);
    });
  });
});

it("normalizes NetworkError to a retryable, generic message", () => {
  expect(normalizeError(new NetworkError())).toEqual({
    code: "network_error",
    message: "Unable to connect to the server.",
    status: null,
    details: null,
    requestId: null,
    retryable: true,
  });
});

it("normalizes TimeoutError to a retryable, generic message", () => {
  expect(normalizeError(new TimeoutError())).toEqual({
    code: "request_timeout",
    message: "The request took too long. Please try again.",
    status: null,
    details: null,
    requestId: null,
    retryable: true,
  });
});

it("normalizes InvalidPathError to a non-retryable, user-safe message", () => {
  const result = normalizeError(new InvalidPathError());

  expect(result).toEqual({
    code: "invalid_request_path",
    message: "The application could not create a valid API request.",
    status: null,
    details: null,
    requestId: null,
    retryable: false,
  });
  // The developer-facing constructor message must never leak to the user.
  expect(result.message).not.toContain("must begin with");
});

describe("normalizeError with unrecognized values", () => {
  const cases: Array<[string, unknown]> = [
    ["a plain Error instance", new Error("some internal detail")],
    ["a string", "raw thrown string"],
    ["a number", 123],
    ["a boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["a plain object", { some: "value" }],
  ];

  cases.forEach(([label, value]) => {
    it(`falls back to a safe unexpected_error for ${label}`, () => {
      expect(normalizeError(value)).toEqual({
        code: "unexpected_error",
        message: "Something went wrong.",
        status: null,
        details: null,
        requestId: null,
        retryable: false,
      });
    });
  });
});

it("never throws, regardless of what is passed in", () => {
  const inputs: unknown[] = [
    new APIError("x", 500, { error: { message: "y" } }),
    new NetworkError(),
    new TimeoutError(),
    new InvalidPathError(),
    new Error("boom"),
    "throw string",
    123,
    false,
    null,
    undefined,
    {},
    [],
  ];

  inputs.forEach((input) => {
    expect(() => normalizeError(input)).not.toThrow();
  });
});
