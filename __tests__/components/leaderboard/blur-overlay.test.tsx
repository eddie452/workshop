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

  it("applies Dusty Denim scrim and strong backdrop blur to the lock overlay", () => {
    // Ticket #151 — locked reveals render behind a Dusty Denim
    // semi-transparent overlay with a high backdrop blur per the
    // Champ Health Design System.
    render(
      <BlurOverlay>
        <span>Content</span>
      </BlurOverlay>
    );
    const lockOverlay = screen.getByTestId("blur-lock-overlay");
    expect(lockOverlay.className).toContain("bg-brand-primary-dark/70");
    expect(lockOverlay.className).toContain("backdrop-blur-lg");
  });

  it("uses Nature Pop for the lock badge accent (sanctioned 2% use)", () => {
    // Ticket #151 — the lock badge on the overlay is one of the few
    // sanctioned Nature Pop (`bg-brand-accent`) accents, signalling
    // the upgrade affordance.
    render(
      <BlurOverlay>
        <span>Content</span>
      </BlurOverlay>
    );
    const lockOverlay = screen.getByTestId("blur-lock-overlay");
    const lockBadge = lockOverlay.querySelector("span[aria-hidden='true']");
    expect(lockBadge).not.toBeNull();
    expect(lockBadge?.className).toContain("bg-brand-accent");
  });
});
