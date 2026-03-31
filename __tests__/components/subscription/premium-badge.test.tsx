/**
 * PremiumBadge Component Tests
 *
 * Tests the premium badge display for different subscription tiers.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PremiumBadge } from "@/components/subscription/premium-badge";

describe("PremiumBadge", () => {
  it("renders locked badge for free tier", () => {
    render(<PremiumBadge tier="free" />);

    expect(screen.getByTestId("premium-badge-locked")).toBeTruthy();
    expect(screen.getByText("Premium")).toBeTruthy();
  });

  it("renders premium badge for madness_plus", () => {
    render(<PremiumBadge tier="madness_plus" />);

    expect(screen.getByTestId("premium-badge")).toBeTruthy();
    expect(screen.getByText("Madness+")).toBeTruthy();
  });

  it("renders premium badge for madness_family", () => {
    render(<PremiumBadge tier="madness_family" />);

    expect(screen.getByTestId("premium-badge")).toBeTruthy();
    expect(screen.getByText("Madness+")).toBeTruthy();
  });

  it("defaults to free tier when no tier provided", () => {
    render(<PremiumBadge />);

    expect(screen.getByTestId("premium-badge-locked")).toBeTruthy();
  });

  it("hides icon in compact mode", () => {
    const { container } = render(
      <PremiumBadge tier="madness_plus" compact />,
    );

    // In compact mode, no aria-hidden icon span
    const icons = container.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBe(0);
  });
});
