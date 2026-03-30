import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn(),
    },
  }),
}));

import SignupPage from "@/app/(auth)/signup/page";

describe("SignupPage", () => {
  it("renders the signup form", () => {
    render(<SignupPage />);

    expect(
      screen.getByRole("heading", { name: /create your account/i }),
    ).toBeDefined();
    expect(screen.getByLabelText(/^email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password/i)).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeDefined();
    expect(screen.getByText(/sign in/i)).toBeDefined();
  });
});
