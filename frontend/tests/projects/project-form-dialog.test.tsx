import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import type { ProjectResponse } from "@/lib/api/contracts";
import { render, screen } from "@testing-library/react";

const project: ProjectResponse = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Foundation launch",
  description: "Prepare the reusable project foundation.",
  status: "planned",
  dueDate: "2026-08-15",
  createdAt: "2026-07-25T12:00:00Z",
  updatedAt: "2026-07-25T12:00:00Z",
};

const onClose = jest.fn();
const onCreate = jest.fn().mockResolvedValue(undefined);
const onUpdate = jest.fn().mockResolvedValue(undefined);

function expectCompactViewportScrolling() {
  expect(screen.getByRole("dialog")).toHaveClass(
    "max-h-[calc(100dvh-2rem)]",
    "overflow-y-auto",
  );
}

describe("Project form dialog", () => {
  it("keeps the create form scrollable within a compact viewport", () => {
    render(
      <ProjectFormDialog
        mode="create"
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />,
    );

    expectCompactViewportScrolling();
  });

  it("keeps the edit form scrollable within a compact viewport", () => {
    render(
      <ProjectFormDialog
        mode="edit"
        project={project}
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />,
    );

    expectCompactViewportScrolling();
  });
});
