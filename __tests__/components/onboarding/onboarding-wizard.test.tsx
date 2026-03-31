/**
 * Onboarding Wizard Tests
 *
 * Validates the multi-step wizard navigation and integration.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock fetch for processing screen
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    profile: { home_region: "Southeast", ccrs: 45 },
    allergen_count: 20,
  }),
});

describe("OnboardingWizard", () => {
  it("renders the first step (address)", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText("Where do you live?")).toBeDefined();
  });

  it("renders the step indicator with 4 steps", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText("Location")).toBeDefined();
    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Health")).toBeDefined();
    expect(screen.getByText("Confirm")).toBeDefined();
  });

  it("navigates to step 2 when address is entered and Continue is clicked", () => {
    render(<OnboardingWizard />);
    // Enter an address
    fireEvent.change(screen.getByLabelText("Home address"), {
      target: { value: "123 Main St, Nashville, TN 37203" },
    });
    fireEvent.click(screen.getByText("Continue"));
    // Should now show step 2
    expect(screen.getByText("About your home")).toBeDefined();
  });

  it("navigates from step 2 to step 3", () => {
    render(<OnboardingWizard />);
    // Step 1 → 2
    fireEvent.change(screen.getByLabelText("Home address"), {
      target: { value: "123 Main St, Nashville, TN 37203" },
    });
    fireEvent.click(screen.getByText("Continue"));
    // Step 2 → 3
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("A few quick questions")).toBeDefined();
  });

  it("navigates back from step 2 to step 1", () => {
    render(<OnboardingWizard />);
    // Go to step 2
    fireEvent.change(screen.getByLabelText("Home address"), {
      target: { value: "123 Main St, Nashville, TN 37203" },
    });
    fireEvent.click(screen.getByText("Continue"));
    // Go back
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Where do you live?")).toBeDefined();
  });

  it("shows confirmation step after health questions", () => {
    render(<OnboardingWizard />);
    // Step 1 → 2
    fireEvent.change(screen.getByLabelText("Home address"), {
      target: { value: "123 Main St, Nashville, TN 37203" },
    });
    fireEvent.click(screen.getByText("Continue"));
    // Step 2 → 3
    fireEvent.click(screen.getByText("Continue"));
    // Step 3 → 4
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Confirm your information")).toBeDefined();
  });

  it("preserves form data across steps", () => {
    render(<OnboardingWizard />);
    // Enter address and go forward
    fireEvent.change(screen.getByLabelText("Home address"), {
      target: { value: "123 Main St, Nashville, TN 37203" },
    });
    fireEvent.click(screen.getByText("Continue"));
    // Go back — address should still be there
    fireEvent.click(screen.getByText("Back"));
    expect(
      (screen.getByLabelText("Home address") as HTMLInputElement).value,
    ).toBe("123 Main St, Nashville, TN 37203");
  });
});
