/**
 * Premium Badge
 *
 * Small badge indicating a feature requires premium access.
 * Shown next to gated features in the UI.
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
      >
        {!compact && <span aria-hidden="true">&#x2B50;</span>}
        Madness+
      </span>
    );
  }

  return (
    <span
      data-testid="premium-badge-locked"
      className="inline-flex items-center gap-1 rounded-full bg-brand-surface-muted px-2 py-0.5 text-xs font-medium text-brand-text-muted"
    >
      {!compact && <span aria-hidden="true">&#x1F512;</span>}
      Premium
    </span>
  );
}
