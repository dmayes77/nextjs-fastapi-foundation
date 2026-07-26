import { render, screen } from "@testing-library/react";

import { ProjectsLoading } from "@/components/projects/projects-loading";

describe("Projects loading state", () => {
  it("renders an intentional busy skeleton", () => {
    render(<ProjectsLoading />);

    expect(screen.getByLabelText("Loading projects")).toHaveAttribute("aria-busy", "true");
  });
});
