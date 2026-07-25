import { APIError } from "@/lib/api/shared";
import type { ProjectResponse } from "@/lib/api/contracts";
import { apiRequest } from "@/lib/api/client";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/api/client", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockApiRequest = jest.mocked(apiRequest);

const plannedProject: ProjectResponse = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Foundation launch",
  description: "Prepare the reusable project foundation.",
  status: "planned",
  dueDate: "2026-08-15",
  createdAt: "2026-07-25T12:00:00Z",
  updatedAt: "2026-07-25T12:00:00Z",
};

const archivedProject: ProjectResponse = {
  ...plannedProject,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Archived reference",
  description: null,
  dueDate: null,
  status: "archived",
};

function response<T>(data: T, status = 200) {
  return Promise.resolve({ status, data });
}

describe("Projects workspace", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("renders project details, optional-field fallbacks, and archived presentation", () => {
    render(<ProjectsWorkspace initialProjects={[plannedProject, archivedProject]} />);

    expect(screen.getByText("Foundation launch")).toBeInTheDocument();
    expect(screen.getByText("Prepare the reusable project foundation.")).toBeInTheDocument();
    expect(screen.getByText("Due Aug 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("Archived reference")).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();

    const archivedCard = screen.getByText("Archived reference").closest('[data-slot="card"]');
    expect(archivedCard).not.toBeNull();
    expect(within(archivedCard as HTMLElement).queryByRole("button", { name: "Edit" })).toBeNull();
    expect(
      within(archivedCard as HTMLElement).queryByRole("button", { name: "Archive" }),
    ).toBeNull();
    expect(within(archivedCard as HTMLElement).getByText("Read only")).toBeInTheDocument();
  });

  it("renders a purposeful empty state with a create action", () => {
    render(<ProjectsWorkspace initialProjects={[]} />);

    expect(screen.getByRole("heading", { name: "No projects yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
  });

  it("renders normalized initial-load errors without transport details", () => {
    render(
      <ProjectsWorkspace
        initialProjects={[]}
        initialError={{
          message: "Unable to connect to the server.",
          requestId: "request-safe-123",
          retryable: true,
        }}
      />,
    );

    expect(screen.getByText("Unable to connect to the server.")).toBeInTheDocument();
    expect(screen.getByText("Request ID: request-safe-123")).toBeInTheDocument();
    expect(screen.queryByText(/traceback|psycopg|database_url/i)).not.toBeInTheDocument();
  });

  it("validates a required non-blank name before create submission", async () => {
    const user = userEvent.setup();
    render(<ProjectsWorkspace initialProjects={[]} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(screen.getByText("Project name is required.")).toBeInTheDocument();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("omits the default status, creates through the generated operation, and updates the list", async () => {
    const user = userEvent.setup();
    const created = { ...plannedProject, name: "New project" };
    mockApiRequest.mockReturnValueOnce(response(created, 201));
    render(<ProjectsWorkspace initialProjects={[]} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "  New project  ");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/projects", {
      body: { name: "New project" },
      method: "POST",
    });
    expect(
      within(await screen.findByLabelText("Project list")).getByText("New project"),
    ).toBeInTheDocument();
  });

  it("offers only valid create statuses and submits a selected non-archived status", async () => {
    const user = userEvent.setup();
    const created = { ...plannedProject, name: "Active project", status: "active" as const };
    mockApiRequest.mockReturnValueOnce(response(created, 201));
    render(<ProjectsWorkspace initialProjects={[]} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "Active project");
    await user.click(screen.getByRole("combobox", { name: "Status" }));

    expect(screen.getByRole("option", { name: "Planned (default)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^Planned$/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Completed" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Archived" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/projects", {
      body: { name: "Active project", status: "active" },
      method: "POST",
    });
  });

  it("prevents duplicate create submissions and exposes pending state", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (value: { status: number; data: ProjectResponse }) => void;
    mockApiRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<ProjectsWorkspace initialProjects={[]} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "Pending project");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    const pendingButton = screen.getByRole("button", { name: "Saving…" });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(mockApiRequest).toHaveBeenCalledTimes(1);

    resolveRequest({
      status: 201,
      data: { ...plannedProject, name: "Pending project" },
    });
    expect(await screen.findByText("Pending project")).toBeInTheDocument();
  });

  it("shows normalized API errors in the create dialog", async () => {
    const user = userEvent.setup();
    mockApiRequest.mockRejectedValueOnce(
      new APIError("Unsafe upstream detail", 422, {
        error: {
          code: "validation_error",
          message: "The request contains invalid values.",
          details: null,
          requestId: "request-123",
        },
      }),
    );
    render(<ProjectsWorkspace initialProjects={[]} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Name"), "Rejected project");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("The request contains invalid values.")).toBeInTheDocument();
    expect(screen.queryByText("Unsafe upstream detail")).not.toBeInTheDocument();
  });

  it("sends only changed edit fields through the typed UUID path", async () => {
    const user = userEvent.setup();
    const updated = { ...plannedProject, name: "Updated foundation" };
    mockApiRequest.mockReturnValueOnce(response(updated));
    render(<ProjectsWorkspace initialProjects={[plannedProject]} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Updated foundation");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/v1/projects/${plannedProject.id}`,
      {
        body: { name: "Updated foundation" },
        method: "PATCH",
      },
    );
    expect(await screen.findByText("Updated foundation")).toBeInTheDocument();
  });

  it("explicitly clears nullable description and due date during edit", async () => {
    const user = userEvent.setup();
    const updated = { ...plannedProject, description: null, dueDate: null };
    mockApiRequest.mockReturnValueOnce(response(updated));
    render(<ProjectsWorkspace initialProjects={[plannedProject]} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Description"));
    await user.clear(screen.getByLabelText("Due date"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/v1/projects/${plannedProject.id}`,
      {
        body: { description: null, dueDate: null },
        method: "PATCH",
      },
    );
  });

  it("keeps edit pending and API error feedback inside the dialog", async () => {
    const user = userEvent.setup();
    mockApiRequest.mockRejectedValueOnce(
      new APIError("Project cannot be changed.", 409, {
        error: { code: "project_archived", message: "Project cannot be changed." },
      }),
    );
    render(<ProjectsWorkspace initialProjects={[plannedProject]} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Stale update");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Project cannot be changed.")).toBeInTheDocument();
  });

  it("requires confirmation, archives through the dedicated UUID path, and makes the card immutable", async () => {
    const user = userEvent.setup();
    const archived = { ...plannedProject, status: "archived" as const };
    mockApiRequest.mockReturnValueOnce(response(archived));
    render(<ProjectsWorkspace initialProjects={[plannedProject]} />);

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("heading", { name: "Archive Foundation launch?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive project" }));

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/v1/projects/${plannedProject.id}/archive`,
      { method: "POST" },
    );
    expect(await screen.findByText("Read only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("keeps a 409 archive conflict visible and prevents duplicate archive requests", async () => {
    const user = userEvent.setup();
    let rejectRequest!: (error: unknown) => void;
    mockApiRequest.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );
    render(<ProjectsWorkspace initialProjects={[plannedProject]} />);

    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Archive project" }));
    const pendingButton = screen.getByRole("button", { name: "Archiving…" });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(mockApiRequest).toHaveBeenCalledTimes(1);

    rejectRequest(
      new APIError("Project already archived.", 409, {
        error: { code: "project_archived", message: "Project already archived." },
      }),
    );
    expect(
      await screen.findByText(
        "This project has already been archived or can no longer be changed.",
      ),
    ).toBeInTheDocument();
  });
});
