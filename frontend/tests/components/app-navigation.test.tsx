import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DesktopNavigation,
  MobileNavigation,
} from "@/components/layout/app-navigation";

const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("application navigation", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/projects");
  });

  it("renders only the real Overview and Projects navigation", () => {
    render(<DesktopNavigation />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByText(/tasks|users|analytics|charts/i)).not.toBeInTheDocument();
  });

  it("opens the mobile navigation and exposes the same accessible links", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
