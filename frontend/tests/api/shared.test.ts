import { APIError, InvalidPathError, NetworkError, TimeoutError } from "@/lib/api/shared";

describe("APIError", () => {
  it("stores the message, status, and details it was constructed with", () => {
    const error = new APIError("Not found", 404, { reason: "missing" });

    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
    expect(error.details).toEqual({ reason: "missing" });
  });

  it("leaves details undefined when not provided", () => {
    const error = new APIError("Bad request", 400);

    expect(error.details).toBeUndefined();
  });

  it("sets a distinct name and extends Error", () => {
    const error = new APIError("Server error", 500);

    expect(error.name).toBe("APIError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(APIError);
  });
});

describe("NetworkError", () => {
  it("uses a safe default message when none is provided", () => {
    const error = new NetworkError();

    expect(error.message).toBe("Unable to reach the server.");
  });

  it("accepts a custom message and preserves the cause", () => {
    const cause = new Error("socket hang up");
    const error = new NetworkError("Custom network failure", { cause });

    expect(error.message).toBe("Custom network failure");
    expect(error.cause).toBe(cause);
  });

  it("sets a distinct name and extends Error", () => {
    const error = new NetworkError();

    expect(error.name).toBe("NetworkError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe("TimeoutError", () => {
  it("uses a safe default message when none is provided", () => {
    const error = new TimeoutError();

    expect(error.message).toBe("The request timed out.");
  });

  it("accepts a custom message", () => {
    const error = new TimeoutError("Custom timeout");

    expect(error.message).toBe("Custom timeout");
  });

  it("sets a distinct name and extends Error", () => {
    const error = new TimeoutError();

    expect(error.name).toBe("TimeoutError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TimeoutError);
  });
});

describe("InvalidPathError", () => {
  it("uses a safe default message when none is provided", () => {
    const error = new InvalidPathError();

    expect(error.message).toBe(
      'API request path must begin with "/" and must not include an origin.',
    );
  });

  it("accepts a custom message", () => {
    const error = new InvalidPathError("Custom path error");

    expect(error.message).toBe("Custom path error");
  });

  it("sets a distinct name and extends Error", () => {
    const error = new InvalidPathError();

    expect(error.name).toBe("InvalidPathError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidPathError);
  });
});
