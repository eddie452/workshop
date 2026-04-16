/**
 * UpgradeCta Component Tests
 *
 * Tests the upgrade call-to-action component for free-tier users,
 * including telemetry + coming-soon feedback for the no-op subscribe
 * button (ticket #75).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SUBSCRIBE_INTENT_EVENT,
  UpgradeCta,
} from "@/components/subscription/upgrade-cta";

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

  describe("subscribe click telemetry (ticket #75)", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("does not render coming-soon feedback before click", () => {
      render(<UpgradeCta />);
      expect(screen.queryByTestId("upgrade-cta-coming-soon")).toBeNull();
    });

    it("reveals coming-soon feedback when subscribe is clicked", () => {
      render(<UpgradeCta tierName="Madness+" />);

      fireEvent.click(screen.getByTestId("upgrade-cta-subscribe"));

      const feedback = screen.getByTestId("upgrade-cta-coming-soon");
      expect(feedback).toBeTruthy();
      expect(feedback.textContent).toMatch(/coming soon/i);
      expect(feedback.textContent).toMatch(/Madness\+/);
    });

    it("uses an aria-live region for the feedback message", () => {
      render(<UpgradeCta />);

      fireEvent.click(screen.getByTestId("upgrade-cta-subscribe"));

      const feedback = screen.getByTestId("upgrade-cta-coming-soon");
      expect(feedback.getAttribute("role")).toBe("status");
      expect(feedback.getAttribute("aria-live")).toBe("polite");
    });

    it("logs a structured telemetry event on subscribe click", () => {
      render(
        <UpgradeCta
          feature="Final Four details"
          tierName="Madness Family"
        />,
      );

      fireEvent.click(screen.getByTestId("upgrade-cta-subscribe"));

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const [tag, payload] = consoleSpy.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(tag).toBe("[telemetry]");
      expect(payload.event).toBe(SUBSCRIBE_INTENT_EVENT);
      expect(payload.feature).toBe("Final Four details");
      expect(payload.tierName).toBe("Madness Family");
      expect(typeof payload.timestamp).toBe("string");
      // ISO 8601 shape check
      expect(payload.timestamp as string).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it("invokes onSubscribeClick with the same payload", () => {
      const handler = vi.fn();
      render(
        <UpgradeCta
          feature="premium features"
          tierName="Madness+"
          onSubscribeClick={handler}
        />,
      );

      fireEvent.click(screen.getByTestId("upgrade-cta-subscribe"));

      expect(handler).toHaveBeenCalledTimes(1);
      const payload = handler.mock.calls[0][0];
      expect(payload.event).toBe(SUBSCRIBE_INTENT_EVENT);
      expect(payload.feature).toBe("premium features");
      expect(payload.tierName).toBe("Madness+");
    });

    it("telemetry payload does not include PII or health data fields", () => {
      const handler = vi.fn();
      render(<UpgradeCta onSubscribeClick={handler} />);

      fireEvent.click(screen.getByTestId("upgrade-cta-subscribe"));

      const payload = handler.mock.calls[0][0] as Record<string, unknown>;
      const forbidden = [
        "email",
        "userId",
        "user_id",
        "name",
        "phone",
        "address",
        "ip",
        "allergens",
        "symptoms",
        "diagnosis",
        "healthData",
      ];
      for (const key of forbidden) {
        expect(payload).not.toHaveProperty(key);
      }
      // Only the documented keys are present.
      expect(Object.keys(payload).sort()).toEqual(
        ["event", "feature", "tierName", "timestamp"].sort(),
      );
    });
  });
});
