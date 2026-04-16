/**
 * Upgrade CTA (Call to Action)
 *
 * Prompts free-tier users to upgrade or unlock via referrals.
 * Shown alongside the blur overlay on gated content.
 *
 * Telemetry: the subscribe button is a no-op placeholder until the
 * payment integration (RevenueCat) lands. Clicks emit a structured
 * intent event so we can size demand and show the user "Coming soon!"
 * feedback. Event payloads never include PII or health data.
 */

"use client";

import { useCallback, useState } from "react";

/** Structured event name for the subscribe-intent signal. */
export const SUBSCRIBE_INTENT_EVENT = "subscribe_cta_clicked";

/** Shape of the subscribe-intent event payload (no PII, no health data). */
export interface SubscribeIntentEvent {
  /** Event discriminator. */
  event: typeof SUBSCRIBE_INTENT_EVENT;
  /** Which feature the user was gated on when they clicked. */
  feature: string;
  /** Tier name shown in the CTA copy. */
  tierName: string;
  /** ISO timestamp of the click. */
  timestamp: string;
}

export interface UpgradeCtaProps {
  /** The feature being gated (for contextual messaging) */
  feature?: string;
  /** Tier name shown in copy (default: "Madness+") */
  tierName?: string;
  /** Number of referrals still needed to unlock (0 if already unlocked) */
  referralsNeeded?: number;
  /**
   * Fires when the subscribe button is clicked with a sanitized,
   * PII-free payload. Use for parent-level analytics hooks.
   */
  onSubscribeClick?: (event: SubscribeIntentEvent) => void;
}

export function UpgradeCta({
  feature = "premium features",
  tierName = "Madness+",
  referralsNeeded = 3,
  onSubscribeClick,
}: UpgradeCtaProps) {
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSubscribeClick = useCallback(() => {
    const payload: SubscribeIntentEvent = {
      event: SUBSCRIBE_INTENT_EVENT,
      feature,
      tierName,
      timestamp: new Date().toISOString(),
    };

    // Structured console log — picked up by browser-side telemetry
    // collectors in prod, visible in dev. No PII or health data.
    console.info("[telemetry]", payload);

    onSubscribeClick?.(payload);
    setShowComingSoon(true);
  }, [feature, tierName, onSubscribeClick]);

  return (
    <div
      data-testid="upgrade-cta"
      className="mx-auto max-w-md rounded-xl border border-brand-border bg-gradient-to-br from-brand-premium-light to-white p-6 text-center shadow-md"
    >
      <h3 className="mb-2 text-lg font-bold text-brand-premium-dark">
        Unlock {feature}
      </h3>
      <p className="mb-4 text-sm text-brand-text-secondary">
        Get the full picture of your allergen triggers with {tierName}.
      </p>

      {/* Primary CTA — Madness+ */}
      <button
        type="button"
        data-testid="upgrade-cta-subscribe"
        className="mb-3 w-full cursor-pointer rounded-button border-none bg-brand-premium px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-premium-dark"
        onClick={handleSubscribeClick}
      >
        Upgrade to {tierName}
      </button>

      {/* Coming-soon feedback — replaces the silent no-op click */}
      {showComingSoon && (
        <p
          role="status"
          aria-live="polite"
          data-testid="upgrade-cta-coming-soon"
          className="mb-3 text-sm font-medium text-brand-premium-dark"
        >
          Subscriptions coming soon! We&apos;ll let you know when
          {" "}
          {tierName} opens up.
        </p>
      )}

      {/* Secondary CTA — Referral unlock */}
      {referralsNeeded > 0 && (
        <p
          data-testid="upgrade-cta-referral"
          className="text-xs text-brand-text-muted"
        >
          Or invite {referralsNeeded} friend{referralsNeeded !== 1 ? "s" : ""}{" "}
          to unlock for free
        </p>
      )}
    </div>
  );
}
