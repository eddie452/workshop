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
          className="mb-2 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-brand-primary"
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </span>
        {!showUpgradeCta && (
          <p className="text-sm font-medium text-brand-text-secondary">
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
