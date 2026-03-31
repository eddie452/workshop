/**
 * BlurOverlay Component Tests
 *
 * Tests the freemium blur overlay with optional UpgradeCta integration.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlurOverlay } from "@/components/leaderboard/blur-overlay";

describe("BlurOverlay", () => {
  it("renders blurred content with lock icon", () => {
    render(
      <BlurOverlay>
        <div data-testid="inner-content">Secret content</div>
      </BlurOverlay>,
    );

    expect(screen.getByTestId("blur-overlay")).toBeTruthy();
    expect(screen.getByTestId("blur-lock-overlay")).toBeTruthy();
    // Content is rendered but blurred (aria-hidden)
    expect(screen.getByTestId("inner-content")).toBeTruthy();
  });

  it("shows default upgrade text when showUpgradeCta is false", () => {
    render(
      <BlurOverlay>
        <div>Content</div>
      </BlurOverlay>,
    );

    expect(screen.getByText("Upgrade to Madness+ to reveal")).toBeTruthy();
  });

  it("shows UpgradeCta when showUpgradeCta is true", () => {
    render(
      <BlurOverlay showUpgradeCta featureLabel="Final Four" referralsNeeded={2}>
        <div>Content</div>
      </BlurOverlay>,
    );

    expect(screen.getByTestId("upgrade-cta")).toBeTruthy();
    expect(screen.getByText("Unlock Final Four")).toBeTruthy();
    // Default text should NOT be shown
    expect(
      screen.queryByText("Upgrade to Madness+ to reveal"),
    ).toBeNull();
  });

  it("renders pulse animation on lock icon", () => {
    render(
      <BlurOverlay>
        <div>Content</div>
      </BlurOverlay>,
    );

    const lockOverlay = screen.getByTestId("blur-lock-overlay");
    const lockIcon = lockOverlay.querySelector("span[aria-hidden='true']");
    expect(lockIcon).toBeTruthy();
    expect(lockIcon?.className).toContain("animate-pulse");
  });
});
