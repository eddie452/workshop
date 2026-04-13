/**
 * UpgradeCta Component Tests
 *
 * Tests the upgrade call-to-action component for free-tier users.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";

describe("UpgradeCta", () => {
  it("renders with default props", () => {
    render(<UpgradeCta />);

    expect(screen.getByTestId("upgrade-cta")).toBeTruthy();
    expect(screen.getByText("Unlock premium features")).toBeTruthy();
    expect(screen.getByTestId("upgrade-cta-subscribe")).toBeTruthy();
  });

  it("renders custom feature label", () => {
    render(<UpgradeCta feature="Final Four details" />);

    expect(screen.getByText("Unlock Final Four details")).toBeTruthy();
  });

  it("shows referral count when referrals needed", () => {
    render(<UpgradeCta referralsNeeded={2} />);

    expect(screen.getByTestId("upgrade-cta-referral")).toBeTruthy();
    expect(
      screen.getByText(/invite 2 friends to unlock for free/i),
    ).toBeTruthy();
  });

  it("uses singular 'friend' when 1 referral needed", () => {
    render(<UpgradeCta referralsNeeded={1} />);

    expect(
      screen.getByText(/invite 1 friend to unlock for free/i),
    ).toBeTruthy();
  });

  it("hides referral CTA when referrals not needed", () => {
    render(<UpgradeCta referralsNeeded={0} />);

    expect(screen.queryByTestId("upgrade-cta-referral")).toBeNull();
  });

  it("defaults tier name to Madness+", () => {
    render(<UpgradeCta />);

    expect(
      screen.getByText(/with Madness\+/),
    ).toBeTruthy();
    expect(
      screen.getByText("Upgrade to Madness+"),
    ).toBeTruthy();
  });

  it("renders custom tier name when provided", () => {
    render(<UpgradeCta tierName="Madness Family" />);

    expect(
      screen.getByText(/with Madness Family/),
    ).toBeTruthy();
    expect(
      screen.getByText("Upgrade to Madness Family"),
    ).toBeTruthy();
  });
});
