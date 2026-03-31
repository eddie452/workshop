/**
 * Processing Screen Tests
 *
 * Validates the processing screen displays messages sequentially.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessingScreen } from "@/components/onboarding/processing-screen";
import { INITIAL_FORM_DATA } from "@/components/onboarding/types";
import { PROCESSING_MESSAGES } from "@/lib/onboarding/processing-messages";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ProcessingScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: { home_region: "Southeast", ccrs: 45 },
        allergen_count: 20,
      }),
    });
  });

  it("renders the processing screen", () => {
    render(<ProcessingScreen formData={INITIAL_FORM_DATA} />);
    expect(screen.getByTestId("processing-screen")).toBeDefined();
  });

  it("displays the first processing message", () => {
    render(<ProcessingScreen formData={INITIAL_FORM_DATA} />);
    expect(
      screen.getByTestId("processing-message").textContent,
    ).toBe(PROCESSING_MESSAGES[0]);
  });

  it("renders the heading", () => {
    render(<ProcessingScreen formData={INITIAL_FORM_DATA} />);
    expect(screen.getByText("Building your prediction")).toBeDefined();
  });

  it("renders a progress bar", () => {
    render(<ProcessingScreen formData={INITIAL_FORM_DATA} />);
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("renders a loading spinner", () => {
    render(<ProcessingScreen formData={INITIAL_FORM_DATA} />);
    expect(screen.getByRole("status", { name: "Processing" })).toBeDefined();
  });

  it("calls the onboarding API on mount", () => {
    render(
      <ProcessingScreen
        formData={{ ...INITIAL_FORM_DATA, address: "123 Main St" }}
      />,
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/onboarding", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
  });

  it("shows error state when API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(
      <ProcessingScreen
        formData={{ ...INITIAL_FORM_DATA, address: "123 Main St" }}
      />,
    );

    // Wait for error to appear
    const errorText = await screen.findByText("Something went wrong");
    expect(errorText).toBeDefined();
  });

  it("sends correct form data in API request", () => {
    const formData = {
      ...INITIAL_FORM_DATA,
      address: "456 Oak Ave, Austin, TX",
      has_pets: true,
      pet_types: ["Dog"],
      prior_allergy_diagnosis: true,
      seasonal_pattern: "spring" as const,
    };
    render(<ProcessingScreen formData={formData} />);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.address).toBe("456 Oak Ave, Austin, TX");
    expect(callBody.has_pets).toBe(true);
    expect(callBody.pet_types).toEqual(["Dog"]);
    expect(callBody.prior_allergy_diagnosis).toBe(true);
    expect(callBody.seasonal_pattern).toBe("spring");
  });
});
