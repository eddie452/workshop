"use client";

/**
 * Final Four Unlock CTA
 *
 * The growth-loop CTA that sits beneath the blurred Final Four reveal.
 * Offers two paths to unlock ranks #2-#4 and their confidence scores:
 *   1. Primary: invite 3 friends (referral unlock — free, viral)
 *   2. Secondary: upgrade to Pro (existing upgrade route)
 *
 * Design tokens:
 *   - Background: nature-pop (Nature Pop) — sanctioned Final Four use per
 *     Champ Health Design System 2% rule.
 *   - Text: dusty-denim for AA contrast on Nature Pop.
 *
 * Achievement framing: when the user has 1-2 referral credits, the copy
 * shifts to "Almost there — unlock N more" with a progress indicator.
 *
 * Tracking: impression fires on mount; invite/upgrade clicks fire before
 * navigation so analytics land even if the user leaves the page.
 */

import Link from "next/link";
import { useEffect } from "react";
import { REFERRAL_UNLOCK_THRESHOLD } from "@/lib/referral/constants";

export interface FinalFourUnlockCtaProps {
  /** Current referral credit count (0, 1, 2, or 3+). */
  referralCount?: number;
  /** Fires once on mount; use for impression analytics. */
  onImpression?: () => void;
  /** Fires before navigating to the invite/share surface. */
  onInviteClick?: () => void;
  /** Fires before navigating to the upgrade route. */
  onUpgradeClick?: () => void;
}

export function FinalFourUnlockCta({
  referralCount = 0,
  onImpression,
  onInviteClick,
  onUpgradeClick,
}: FinalFourUnlockCtaProps) {
  useEffect(() => {
    onImpression?.();
    // We intentionally only fire once per mount — analytics impression.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = Math.max(
    0,
    REFERRAL_UNLOCK_THRESHOLD - referralCount,
  );
  const almostThere = referralCount > 0 && remaining > 0;

  const headline = almostThere
    ? `Almost there — unlock ${remaining} more`
    : "Unlock the Final Four & Full Confidence Scores";

  const inviteLabel =
    remaining === REFERRAL_UNLOCK_THRESHOLD
      ? "Invite 3 Friends"
      : `Invite ${remaining} More Friend${remaining === 1 ? "" : "s"}`;

  return (
    <div
      data-testid="final-four-unlock-cta"
      className="mt-6 rounded-xl bg-nature-pop p-6 text-center shadow-md"
    >
      <h3
        data-testid="final-four-unlock-cta-headline"
        className="mb-2 text-lg font-bold text-dusty-denim"
      >
        {headline}
      </h3>
      <p className="mb-4 text-sm text-dusty-denim/80">
        See ranks #2-#4 and their confidence scores. Invite 3 friends to
        unlock free — or upgrade to Pro.
      </p>

      {almostThere && (
        <div
          data-testid="final-four-unlock-progress"
          aria-label={`${referralCount} of ${REFERRAL_UNLOCK_THRESHOLD} friends invited`}
          className="mx-auto mb-4 flex max-w-xs items-center gap-1"
        >
          {Array.from({ length: REFERRAL_UNLOCK_THRESHOLD }).map(
            (_, idx) => (
              <span
                key={idx}
                data-testid="final-four-unlock-progress-pip"
                data-filled={idx < referralCount}
                className={
                  idx < referralCount
                    ? "h-2 flex-1 rounded-full bg-dusty-denim"
                    : "h-2 flex-1 rounded-full bg-dusty-denim/20"
                }
              />
            ),
          )}
        </div>
      )}

      {/* Primary CTA — referral share */}
      <Link
        href="/referral"
        data-testid="final-four-unlock-invite"
        onClick={() => onInviteClick?.()}
        className="mb-3 inline-block w-full rounded-button bg-dusty-denim px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-dusty-denim/80"
      >
        {inviteLabel}
      </Link>

      {/* Secondary CTA — upgrade to Pro */}
      <Link
        // TODO(billing): point to /upgrade once Stripe checkout lands. Tracked in future billing epic.
        href="/referral"
        data-testid="final-four-unlock-upgrade"
        onClick={() => onUpgradeClick?.()}
        className="inline-block text-xs font-medium text-dusty-denim underline underline-offset-2 hover:text-champ-blue"
      >
        Or upgrade to Pro
      </Link>
    </div>
  );
}
