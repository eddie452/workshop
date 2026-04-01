import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
let mockPathname = "/dashboard";
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Mock Supabase client
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
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
  it("renders the Champ logo as a link to dashboard", () => {
    render(<NavHeader />);

    const logoImg = screen.getByAltText("Champ Allergy");
    expect(logoImg).toBeDefined();
    expect(logoImg.closest("a")?.getAttribute("href")).toBe("/dashboard");
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
      expect(link.className).toContain("text-white");
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

  it("renders a sign-out button in desktop nav", () => {
    mockPathname = "/dashboard";
    render(<NavHeader />);

    const signOutButton = screen.getByTestId("sign-out-button");
    expect(signOutButton).toBeDefined();
    expect(signOutButton.textContent).toBe("Sign Out");
  });

  it("renders a sign-out button in mobile menu", () => {
    mockPathname = "/dashboard";
    render(<NavHeader />);

    // Open mobile menu
    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);

    const mobileSignOut = screen.getByTestId("sign-out-button-mobile");
    expect(mobileSignOut).toBeDefined();
    expect(mobileSignOut.textContent).toBe("Sign Out");
  });

  it("calls signOut and redirects to / when sign-out is clicked", async () => {
    mockPathname = "/dashboard";
    mockSignOut.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();

    render(<NavHeader />);

    const signOutButton = screen.getByTestId("sign-out-button");
    fireEvent.click(signOutButton);

    // Wait for async signOut
    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce();
    });

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalled();
  });
});
