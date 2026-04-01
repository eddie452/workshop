import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Track redirect calls
const redirectMock = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    // redirect throws in Next.js to halt rendering
    throw new Error("NEXT_REDIRECT");
  },
}));

// Mock next/link as a simple anchor
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

// Default: unauthenticated user
let mockUser: { id: string; email: string } | null = null;
let mockProfileData: { home_region: string | null } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mockUser },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: mockProfileData,
          }),
        }),
      }),
    }),
  })),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockProfileData = null;
  });

  describe("Unauthenticated users", () => {
    it("renders the branded landing page", async () => {
      const Page = await HomePage();
      render(Page);

      expect(
        screen.getByRole("heading", {
          name: /allergy madness/i,
        }),
      ).toBeDefined();
    });

    it("shows Allergy Madness branding", async () => {
      const Page = await HomePage();
      render(Page);

      expect(screen.getByText("Allergy Madness")).toBeDefined();
    });

    it("shows Champ Allergy branding in nav", async () => {
      const Page = await HomePage();
      render(Page);

      expect(screen.getByAltText("Champ Allergy")).toBeDefined();
    });

    it('has a "Get Started Free" CTA linking to signup', async () => {
      const Page = await HomePage();
      render(Page);

      const cta = screen.getAllByText(/get started/i);
      expect(cta.length).toBeGreaterThan(0);

      // At least one should link to /signup
      const signupLinks = screen
        .getAllByRole("link")
        .filter(
          (link) =>
            link.getAttribute("href") === "/signup" &&
            link.textContent?.match(/get started/i),
        );
      expect(signupLinks.length).toBeGreaterThan(0);
    });

    it('has a "Sign In" link to /login', async () => {
      const Page = await HomePage();
      render(Page);

      const signInLinks = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href") === "/login");
      expect(signInLinks.length).toBeGreaterThan(0);
    });

    it("displays the FDA disclaimer", async () => {
      const Page = await HomePage();
      render(Page);

      expect(
        screen.getByText(/predicted triggers/i),
      ).toBeDefined();
    });

    it("shows the How It Works section", async () => {
      const Page = await HomePage();
      render(Page);

      expect(
        screen.getByRole("heading", { name: /how it works/i }),
      ).toBeDefined();
    });

    it("shows the Features section", async () => {
      const Page = await HomePage();
      render(Page);

      expect(
        screen.getByRole("heading", { name: /features/i }),
      ).toBeDefined();
      expect(screen.getByText(/symptom check-in/i)).toBeDefined();
      expect(screen.getByText(/trigger leaderboard/i)).toBeDefined();
      expect(screen.getByText(/trigger scout/i)).toBeDefined();
    });
  });

  describe("Authenticated users with completed profile", () => {
    it("redirects to /dashboard", async () => {
      mockUser = { id: "user-1", email: "test@example.com" };
      mockProfileData = { home_region: "Southeast" };

      await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Authenticated users without completed profile", () => {
    it("redirects to /onboarding", async () => {
      mockUser = { id: "user-2", email: "new@example.com" };
      mockProfileData = { home_region: null };

      await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirectMock).toHaveBeenCalledWith("/onboarding");
    });
  });
});
