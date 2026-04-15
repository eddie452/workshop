/**
 * Blur Overlay
 *
 * Freemium gate overlay that blurs content for free-tier users and
 * renders the gated content behind a Dusty Denim (#0682BB) semi-
 * transparent scrim with a strong backdrop blur. Shows a Nature Pop
 * (#CCDC29) accented lock badge — the one sanctioned 2% use on this
 * surface per the Champ Health Design System — and either a brief
 * prompt or the full UpgradeCta card.
 *
 * Accessibility:
 *   - Blurred content is marked `aria-hidden` and non-interactive so
 *     screen readers skip the silhouette and keyboard focus cannot
 *     land on the underlying cards.
 *   - The upgrade affordance on top of the scrim remains focusable.
 */

import type { BlurOverlayProps } from "./types";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";
import { LockIcon } from "@/components/shared";

export function BlurOverlay({
  children,
  referralsNeeded,
  featureLabel,
  showUpgradeCta = false,
}: BlurOverlayProps) {
  return (
    <div
      data-testid="blur-overlay"
      className="relative"
    >
      {/* Blurred content */}
      <div
        className="pointer-events-none select-none blur-md"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock overlay — Dusty Denim scrim + strong backdrop blur */}
      <div
        data-testid="blur-lock-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-brand-primary-dark/70 backdrop-blur-lg"
      >
        <span
          className="mb-2 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-brand-accent shadow-md"
          aria-hidden="true"
        >
          <LockIcon size={24} stroke="#0682BB" />
        </span>
        {!showUpgradeCta && (
          <p className="text-sm font-medium text-white">
            Upgrade to Madness+ to reveal
          </p>
        )}
        {showUpgradeCta && (
          <div className="mt-2">
            <UpgradeCta
              feature={featureLabel}
              referralsNeeded={referralsNeeded}
            />
          </div>
        )}
      </div>
    </div>
  );
}
