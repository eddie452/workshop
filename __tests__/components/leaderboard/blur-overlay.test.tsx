/**
 * Blur Overlay Tests
 *
 * Validates the freemium gate that blurs content for free-tier users.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlurOverlay } from "@/components/leaderboard/blur-overlay";

describe("BlurOverlay", () => {
  it("renders children inside a blur wrapper", () => {
    render(
      <BlurOverlay>
        <span data-testid="child">Content</span>
      </BlurOverlay>
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("renders the blur overlay container", () => {
    render(
      <BlurOverlay>
        <span>Content</span>
      </BlurOverlay>
    );
    expect(screen.getByTestId("blur-overlay")).toBeDefined();
  });

  it("shows lock overlay with upgrade message", () => {
    render(
      <BlurOverlay>
        <span>Content</span>
      </BlurOverlay>
    );
    expect(screen.getByTestId("blur-lock-overlay")).toBeDefined();
    expect(
      screen.getByText("Upgrade to Madness+ to reveal")
    ).toBeDefined();
  });

  it("marks blurred children as aria-hidden", () => {
    render(
      <BlurOverlay>
        <span>Content</span>
      </BlurOverlay>
    );
    // The blur wrapper has aria-hidden="true"
    const overlay = screen.getByTestId("blur-overlay");
    const blurredDiv = overlay.querySelector("[aria-hidden='true']");
    expect(blurredDiv).not.toBeNull();
  });
});
