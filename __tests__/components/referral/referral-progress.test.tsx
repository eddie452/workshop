/**
 * Referral Progress Component Tests
 *
 * Validates:
 * - Correct display of progress count
 * - Unlocked state rendering
 * - Progress bar accessibility
 * - Step indicators
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReferralProgress } from "@/components/referral/referral-progress";
import { REFERRAL_UNLOCK_THRESHOLD } from "@/lib/referral/constants";

describe("ReferralProgress", () => {
  it("renders current progress count", () => {
    render(
      <ReferralProgress referralCount={2} featuresUnlocked={false} />,
    );
    expect(
      screen.getByText(`2 of ${REFERRAL_UNLOCK_THRESHOLD} friends invited`),
    ).toBeDefined();
  });

  it("shows how many more referrals needed", () => {
    render(
      <ReferralProgress referralCount={1} featuresUnlocked={false} />,
    );
    expect(
      screen.getByText(/Invite 2 more friends to unlock all features/),
    ).toBeDefined();
  });

  it("uses singular when 1 more needed", () => {
    render(
      <ReferralProgress referralCount={2} featuresUnlocked={false} />,
    );
    expect(
      screen.getByText(/Invite 1 more friend to unlock all features/),
    ).toBeDefined();
  });

  it("renders unlocked state when features are unlocked", () => {
    render(
      <ReferralProgress referralCount={3} featuresUnlocked={true} />,
    );
    expect(screen.getByText("All features unlocked!")).toBeDefined();
  });

  it("renders unlocked state with more than threshold referrals", () => {
    render(
      <ReferralProgress referralCount={5} featuresUnlocked={true} />,
    );
    expect(screen.getByText("All features unlocked!")).toBeDefined();
    expect(screen.getByText(/5 friends/)).toBeDefined();
  });

  it("has accessible progress bar", () => {
    render(
      <ReferralProgress referralCount={2} featuresUnlocked={false} />,
    );
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("2");
    expect(progressBar.getAttribute("aria-valuemax")).toBe(
      String(REFERRAL_UNLOCK_THRESHOLD),
    );
  });

  it("has data-testid for targeting", () => {
    render(
      <ReferralProgress referralCount={0} featuresUnlocked={false} />,
    );
    expect(screen.getByTestId("referral-progress")).toBeDefined();
  });

  it("applies custom className", () => {
    render(
      <ReferralProgress
        referralCount={0}
        featuresUnlocked={false}
        className="custom-class"
      />,
    );
    const el = screen.getByTestId("referral-progress");
    expect(el.className).toContain("custom-class");
  });
});
