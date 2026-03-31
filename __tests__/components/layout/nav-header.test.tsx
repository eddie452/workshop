import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { NavHeader } from "@/components/layout/nav-header";

describe("NavHeader", () => {
  it("renders the app name as a link to dashboard", () => {
    render(<NavHeader />);

    const logoLink = screen.getByText("Allergy Madness");
    expect(logoLink).toBeDefined();
    expect(logoLink.closest("a")?.getAttribute("href")).toBe("/dashboard");
  });

  it("renders all navigation links", () => {
    render(<NavHeader />);

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/checkin");
    expect(hrefs).toContain("/children");
    expect(hrefs).toContain("/scout");
  });

  it("highlights the active link based on pathname", () => {
    mockPathname = "/checkin";
    render(<NavHeader />);

    // The checkin links (desktop + mobile) should have the active style
    const checkinLinks = screen.getAllByText("Check-in");
    for (const link of checkinLinks) {
      expect(link.className).toContain("text-brand-primary");
    }
  });

  it("has a test ID for integration targeting", () => {
    render(<NavHeader />);
    expect(screen.getByTestId("nav-header")).toBeDefined();
  });

  it("toggles mobile menu on hamburger click", () => {
    mockPathname = "/dashboard";
    render(<NavHeader />);

    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);

    // After opening, the button label should change
    expect(screen.getByLabelText("Close menu")).toBeDefined();
  });
});
