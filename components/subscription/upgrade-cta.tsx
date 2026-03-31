/**
 * Upgrade CTA (Call to Action)
 *
 * Prompts free-tier users to upgrade to Madness+ or unlock via referrals.
 * Shown alongside the blur overlay on gated content.
 */

"use client";

export interface UpgradeCtaProps {
  /** The feature being gated (for contextual messaging) */
  feature?: string;
  /** Number of referrals still needed to unlock (0 if already unlocked) */
  referralsNeeded?: number;
}

export function UpgradeCta({
  feature = "premium features",
  referralsNeeded = 3,
}: UpgradeCtaProps) {
  return (
    <div
      data-testid="upgrade-cta"
      className="mx-auto max-w-md rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 text-center shadow-md"
    >
      <h3 className="mb-2 text-lg font-bold text-purple-900">
        Unlock {feature}
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        Get the full picture of your allergen triggers with Madness+.
      </p>

      {/* Primary CTA — Madness+ */}
      <button
        type="button"
        data-testid="upgrade-cta-subscribe"
        className="mb-3 w-full cursor-pointer rounded-lg border-none bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
        onClick={() => {
          // Placeholder — will connect to RevenueCat paywall
        }}
      >
        Upgrade to Madness+
      </button>

      {/* Secondary CTA — Referral unlock */}
      {referralsNeeded > 0 && (
        <p
          data-testid="upgrade-cta-referral"
          className="text-xs text-gray-500"
        >
          Or invite {referralsNeeded} friend{referralsNeeded !== 1 ? "s" : ""}{" "}
          to unlock for free
        </p>
      )}
    </div>
  );
}
