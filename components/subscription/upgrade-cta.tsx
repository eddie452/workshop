/**
 * Upgrade CTA (Call to Action)
 *
 * Prompts free-tier users to upgrade or unlock via referrals.
 * Shown alongside the blur overlay on gated content.
 */

"use client";

export interface UpgradeCtaProps {
  /** The feature being gated (for contextual messaging) */
  feature?: string;
  /** Tier name shown in copy (default: "Madness+") */
  tierName?: string;
  /** Number of referrals still needed to unlock (0 if already unlocked) */
  referralsNeeded?: number;
}

export function UpgradeCta({
  feature = "premium features",
  tierName = "Madness+",
  referralsNeeded = 3,
}: UpgradeCtaProps) {
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
        onClick={() => {
          // Placeholder — will connect to RevenueCat paywall
        }}
      >
        Upgrade to {tierName}
      </button>

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
