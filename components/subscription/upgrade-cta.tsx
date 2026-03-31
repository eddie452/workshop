/**
 * Upgrade CTA (Call to Action)
 *
 * Prompts free-tier users to upgrade to Madness+ or unlock via referrals.
 * Shown alongside the blur overlay on gated content.
 *
 * Dual styling: Tailwind utility classes + inline styles.
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
      style={{
        maxWidth: "28rem",
        margin: "0 auto",
        borderRadius: "0.75rem",
        border: "1px solid #e9d5ff",
        background: "linear-gradient(to bottom right, #faf5ff, #ffffff)",
        padding: "1.5rem",
        textAlign: "center",
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)",
      }}
    >
      <h3
        className="mb-2 text-lg font-bold text-purple-900"
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "#581c87",
          marginBottom: "0.5rem",
        }}
      >
        Unlock {feature}
      </h3>
      <p
        className="mb-4 text-sm text-gray-600"
        style={{
          fontSize: "0.875rem",
          color: "#4b5563",
          marginBottom: "1rem",
        }}
      >
        Get the full picture of your allergen triggers with Madness+.
      </p>

      {/* Primary CTA — Madness+ */}
      <button
        type="button"
        data-testid="upgrade-cta-subscribe"
        className="mb-3 w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
        style={{
          width: "100%",
          borderRadius: "0.5rem",
          backgroundColor: "#9333ea",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          paddingTop: "0.625rem",
          paddingBottom: "0.625rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          marginBottom: "0.75rem",
          boxShadow: "0 1px 2px 0 rgba(0,0,0,.05)",
        }}
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
          style={{
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          Or invite {referralsNeeded} friend{referralsNeeded !== 1 ? "s" : ""}{" "}
          to unlock for free
        </p>
      )}
    </div>
  );
}
