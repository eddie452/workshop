"use client";

/**
 * Referral Share Component
 *
 * Interactive component for sharing referral links. Includes:
 * - Copy-to-clipboard button
 * - Native share sheet (where supported)
 * - Visual display of the referral link
 *
 * IMPORTANT: Uses window.location.origin — never hardcodes URLs.
 * IMPORTANT: Referral links contain NO health data.
 */

import { useState, useCallback } from "react";
import { buildReferralLink } from "@/lib/referral/code";

export interface ReferralShareProps {
  /** The user's referral code */
  referralCode: string;
  /** Additional CSS class names */
  className?: string;
}

export function ReferralShare({
  referralCode,
  className = "",
}: ReferralShareProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = buildReferralLink(
    typeof window !== "undefined" ? window.location.origin : "",
    referralCode,
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = referralLink;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join Allergy Madness",
          text: "Try Allergy Madness — a free allergy screening tool!",
          url: referralLink,
        });
      } catch {
        // User cancelled share or share failed — no action needed
      }
    }
  }, [referralLink]);

  const hasShareApi = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div
      data-testid="referral-share"
      className={`rounded-card border border-brand-border bg-white p-4 ${className}`.trim()}
    >
      <p className="text-sm font-semibold text-brand-text">
        Your Referral Link
      </p>

      {/* Link display */}
      <div className="mt-2 flex items-center gap-2 rounded-card border border-brand-border-light bg-brand-surface-muted px-3 py-2">
        <code
          data-testid="referral-link-display"
          className="flex-1 truncate text-xs text-brand-text-secondary"
        >
          {referralLink}
        </code>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          data-testid="referral-copy-btn"
          className={`flex-1 cursor-pointer rounded-button border-none px-4 py-2 text-sm font-medium text-white transition-colors ${
            copied
              ? "bg-brand-primary-dark"
              : "bg-brand-primary hover:bg-brand-primary-dark"
          }`}
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>

        {hasShareApi && (
          <button
            type="button"
            onClick={handleShare}
            data-testid="referral-share-btn"
            className="flex-1 cursor-pointer rounded-button border border-brand-primary bg-white px-4 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary-light"
          >
            Share
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-brand-text-faint">
        Share this link with friends. When 3 sign up, all features unlock permanently.
      </p>
    </div>
  );
}
