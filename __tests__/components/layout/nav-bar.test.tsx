import { describe, it, expect, vi, beforeEach } from "vitest";
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

import { NavBar } from "@/components/layout/nav-bar";

describe("NavBar", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockSignOut.mockClear();
  });

  describe("authenticated variant", () => {
    it("renders the Champ logo linking to /dashboard", () => {
      render(<NavBar authState="authenticated" />);

      const logo = screen.getByAltText("Champ Allergy");
      expect(logo.closest("a")?.getAttribute("href")).toBe("/dashboard");
    });

    it("renders all authenticated navigation links", () => {
      render(<NavBar authState="authenticated" />);

      const hrefs = screen
        .getAllByRole("link")
        .map((l) => l.getAttribute("href"));

      expect(hrefs).toContain("/dashboard");
      expect(hrefs).toContain("/checkin");
      expect(hrefs).toContain("/children");
      expect(hrefs).toContain("/scout");
    });

    it("does NOT render unauthenticated links", () => {
      render(<NavBar authState="authenticated" />);

      const hrefs = screen
        .getAllByRole("link")
        .map((l) => l.getAttribute("href"));

      expect(hrefs).not.toContain("/login");
      expect(hrefs).not.toContain("/signup");
    });

    it("highlights the active link based on pathname", () => {
      mockPathname = "/checkin";
      render(<NavBar authState="authenticated" />);

      const checkinLinks = screen.getAllByText("Check-in");
      for (const link of checkinLinks) {
        expect(link.className).toContain("text-white");
      }
    });

    it("sets aria-current='page' on the active link", () => {
      mockPathname = "/checkin";
      render(<NavBar authState="authenticated" />);

      const checkinLinks = screen.getAllByText("Check-in");
      for (const link of checkinLinks) {
        expect(link.getAttribute("aria-current")).toBe("page");
      }

      // Inactive links should NOT have aria-current
      const dashboardLinks = screen.getAllByText("Dashboard");
      for (const link of dashboardLinks) {
        expect(link.getAttribute("aria-current")).toBeNull();
      }
    });

    it("renders sign-out buttons (desktop + mobile after open)", () => {
      render(<NavBar authState="authenticated" />);

      expect(screen.getByTestId("sign-out-button")).toBeDefined();

      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(screen.getByTestId("sign-out-button-mobile")).toBeDefined();
    });

    it("signs out and redirects to / on desktop sign-out click", async () => {
      render(<NavBar authState="authenticated" />);

      fireEvent.click(screen.getByTestId("sign-out-button"));

      await vi.waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledOnce();
      });
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("exposes a stable test id and data-auth-state attribute", () => {
      render(<NavBar authState="authenticated" />);
      const header = screen.getByTestId("nav-bar");
      expect(header.getAttribute("data-auth-state")).toBe("authenticated");
    });

    it("renders the nav landmark with aria-label='Primary'", () => {
      render(<NavBar authState="authenticated" />);
      const nav = screen.getByRole("navigation", { name: "Primary" });
      expect(nav).toBeDefined();
    });
  });

  describe("unauthenticated variant", () => {
    it("renders the Champ logo linking to /", () => {
      render(<NavBar authState="unauthenticated" />);

      const logo = screen.getByAltText("Champ Allergy");
      expect(logo.closest("a")?.getAttribute("href")).toBe("/");
    });

    it("renders Sign In and Get Started links", () => {
      render(<NavBar authState="unauthenticated" />);

      const hrefs = screen
        .getAllByRole("link")
        .map((l) => l.getAttribute("href"));

      expect(hrefs).toContain("/login");
      expect(hrefs).toContain("/signup");
    });

    it("does NOT render authenticated app links", () => {
      render(<NavBar authState="unauthenticated" />);

      const hrefs = screen
        .getAllByRole("link")
        .map((l) => l.getAttribute("href"));

      expect(hrefs).not.toContain("/dashboard");
      expect(hrefs).not.toContain("/checkin");
      expect(hrefs).not.toContain("/children");
      expect(hrefs).not.toContain("/scout");
    });

    it("does NOT render a sign-out button", () => {
      render(<NavBar authState="unauthenticated" />);
      expect(screen.queryByTestId("sign-out-button")).toBeNull();
    });

    it("exposes the data-auth-state attribute", () => {
      render(<NavBar authState="unauthenticated" />);
      const header = screen.getByTestId("nav-bar");
      expect(header.getAttribute("data-auth-state")).toBe("unauthenticated");
    });
  });

  describe("desktop padding + spacing (#276)", () => {
    it("authenticated nav items use comfortable per-item padding so text isn't cramped", () => {
      render(<NavBar authState="authenticated" />);
      const dashLink = screen
        .getAllByRole("link")
        .find((a) => a.getAttribute("href") === "/dashboard" && a.textContent === "Dashboard");
      expect(dashLink).toBeDefined();
      // Base padding contract — px-5 py-2.5 keeps "Dashboard" / "Check-in" etc.
      // from touching the pill edges, and the active pill inherits the same.
      expect(dashLink?.className).toContain("px-5");
      expect(dashLink?.className).toContain("py-2.5");
    });

    it("desktop action row uses a ≥ gap-3 gap between nav items", () => {
      const { container } = render(<NavBar authState="authenticated" />);
      // The desktop action row is the first `hidden sm:flex` container.
      const row = container.querySelector("div.hidden.sm\\:flex");
      expect(row).not.toBeNull();
      expect(row?.className).toContain("gap-3");
    });
  });

  describe("mobile hamburger (both states)", () => {
    it("toggles mobile menu in authenticated state", () => {
      render(<NavBar authState="authenticated" />);

      expect(screen.queryByTestId("nav-bar-mobile-menu")).toBeNull();

      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(screen.getByTestId("nav-bar-mobile-menu")).toBeDefined();
      expect(screen.getByLabelText("Close menu")).toBeDefined();
    });

    it("toggles mobile menu in unauthenticated state", () => {
      render(<NavBar authState="unauthenticated" />);

      expect(screen.queryByTestId("nav-bar-mobile-menu")).toBeNull();

      fireEvent.click(screen.getByLabelText("Open menu"));
      const menu = screen.getByTestId("nav-bar-mobile-menu");
      expect(menu).toBeDefined();

      // Mobile menu exposes Sign In / Get Started
      expect(menu.textContent).toMatch(/sign in/i);
      expect(menu.textContent).toMatch(/get started/i);
    });
  });
});
