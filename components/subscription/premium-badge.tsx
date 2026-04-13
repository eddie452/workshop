/**
 * Premium Badge
 *
 * Small badge indicating a feature requires premium access.
 * Shown next to gated features in the UI.
 */

import type { SubscriptionTier } from "@/lib/subscription/types";
import { LockIcon } from "@/components/shared";

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
        className="inline-flex items-center gap-1 rounded-full bg-brand-primary-light px-2 py-0.5 text-xs font-medium text-brand-primary-dark"
      >
        {!compact && (
          <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </span>
        )}
        Madness+
      </span>
    );
  }

  return (
    <span
      data-testid="premium-badge-locked"
      className="inline-flex items-center gap-1 rounded-full bg-brand-surface-muted px-2 py-0.5 text-xs font-medium text-brand-text-muted"
    >
      {!compact && (
        <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-surface-muted">
          <LockIcon size={10} strokeWidth={2.5} />
        </span>
      )}
      Premium
    </span>
  );
}
