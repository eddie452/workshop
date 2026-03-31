/**
 * Blur Overlay
 *
 * Freemium gate overlay that blurs content for free-tier users.
 * Shows a lock icon with pulse animation and upgrade prompt.
 * Optionally shows the UpgradeCta component for subscription/referral prompts.
 */

import type { BlurOverlayProps } from "./types";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";

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

      {/* Lock overlay */}
      <div
        data-testid="blur-lock-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span
          className="mb-2 animate-pulse text-3xl"
          aria-hidden="true"
        >
          &#x1F512;
        </span>
        {!showUpgradeCta && (
          <p className="text-sm font-medium text-gray-600">
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
