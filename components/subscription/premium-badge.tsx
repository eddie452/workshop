/**
 * Premium Badge
 *
 * Small badge indicating a feature requires premium access.
 * Shown next to gated features in the UI.
 *
 * Dual styling: Tailwind utility classes + inline styles.
 */

import type { SubscriptionTier } from "@/lib/subscription/types";

export interface PremiumBadgeProps {
  /** The user's current tier (affects badge display) */
  tier?: SubscriptionTier;
  /** Compact variant for inline use */
  compact?: boolean;
}

export function PremiumBadge({
  tier = "free",
  compact = false,
}: PremiumBadgeProps) {
  const isPremium = tier !== "free";

  if (isPremium) {
    return (
      <span
        data-testid="premium-badge"
        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          borderRadius: "9999px",
          backgroundColor: "#f3e8ff",
          paddingLeft: "0.5rem",
          paddingRight: "0.5rem",
          paddingTop: "0.125rem",
          paddingBottom: "0.125rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "#7c3aed",
        }}
      >
        {!compact && <span aria-hidden="true">&#x2B50;</span>}
        Madness+
      </span>
    );
  }

  return (
    <span
      data-testid="premium-badge-locked"
      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        borderRadius: "9999px",
        backgroundColor: "#f3f4f6",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        paddingTop: "0.125rem",
        paddingBottom: "0.125rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        color: "#6b7280",
      }}
    >
      {!compact && <span aria-hidden="true">&#x1F512;</span>}
      Premium
    </span>
  );
}
