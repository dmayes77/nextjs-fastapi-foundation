import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BackendStatus } from "@/components/backend-status";
import { apiRequest } from "@/lib/api/client";
import { APIError } from "@/lib/api/shared";

jest.mock("@/lib/api/client", () => ({
  apiRequest: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("BackendStatus", () => {
  afterEach(() => {
    mockedApiRequest.mockReset();
  });

  it("1. shows a loading state before the request resolves", () => {
    mockedApiRequest.mockReturnValue(new Promise(() => {}));

    render(<BackendStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("Checking…");
  });

  it("2. calls /api/backend/health and shows the backend status on success, offering refresh", async () => {
    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });

    render(<BackendStatus />);

    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(mockedApiRequest).toHaveBeenCalledWith("/api/backend/health");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("3. shows a safe message on failure, without exposing AppError.details", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new APIError("Request failed with status 500.", 500, {
        error: {
          code: "backend_health_error",
          message: "Backend reported an error",
          details: { secret: "internal-only-detail" },
          requestId: null,
        },
      }),
    );

    render(<BackendStatus />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend reported an error");
    expect(screen.queryByText(/internal-only-detail/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("4. retries from failure to success on user click, without auto-retrying", async () => {
    const user = userEvent.setup();
    mockedApiRequest.mockRejectedValueOnce(new TypeError("fetch failed"));

    render(<BackendStatus />);

    await screen.findByRole("alert");
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);

    mockedApiRequest.mockResolvedValueOnce({ status: 200, data: { status: "ok" } });
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(mockedApiRequest).toHaveBeenCalledTimes(2);
  });

  it("5. shows a request-ID reference only when the normalized error has one", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new APIError("Request failed with status 500.", 500, {
        error: {
          code: "backend_health_error",
          message: "Backend reported an error",
          details: null,
          requestId: "req-reference-42",
        },
      }),
    );

    render(<BackendStatus />);

    expect(await screen.findByText("Reference: req-reference-42")).toBeInTheDocument();
  });

  it("does not show a reference line when the normalized error has no request ID", async () => {
    mockedApiRequest.mockRejectedValueOnce(new TypeError("fetch failed"));

    render(<BackendStatus />);

    await screen.findByRole("alert");

    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
