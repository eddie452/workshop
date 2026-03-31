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
 *
 * Uses dual styling (Tailwind + inline) per project convention.
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
      // Fallback for environments where clipboard API is unavailable
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
      className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`.trim()}
      style={{
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: "1rem",
      }}
    >
      <p
        className="text-sm font-semibold text-gray-800"
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#1f2937",
          margin: 0,
        }}
      >
        Your Referral Link
      </p>

      {/* Link display */}
      <div
        className="mt-2 flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
        style={{
          marginTop: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderRadius: "0.375rem",
          border: "1px solid #f3f4f6",
          backgroundColor: "#f9fafb",
          padding: "0.5rem 0.75rem",
        }}
      >
        <code
          data-testid="referral-link-display"
          className="flex-1 truncate text-xs text-gray-600"
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "0.75rem",
            color: "#4b5563",
          }}
        >
          {referralLink}
        </code>
      </div>

      {/* Action buttons */}
      <div
        className="mt-3 flex gap-2"
        style={{
          marginTop: "0.75rem",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          data-testid="referral-copy-btn"
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : "bg-indigo-500 text-white hover:bg-indigo-600"
          }`}
          style={{
            flex: 1,
            borderRadius: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            backgroundColor: copied ? "#22c55e" : "#6366f1",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            transition: "background-color 150ms ease",
          }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>

        {hasShareApi && (
          <button
            type="button"
            onClick={handleShare}
            data-testid="referral-share-btn"
            className="flex-1 rounded-md border border-indigo-500 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            style={{
              flex: 1,
              borderRadius: "0.375rem",
              border: "1px solid #6366f1",
              backgroundColor: "#ffffff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#4f46e5",
              cursor: "pointer",
              transition: "background-color 150ms ease",
            }}
          >
            Share
          </button>
        )}
      </div>

      <p
        className="mt-2 text-xs text-gray-400"
        style={{
          marginTop: "0.5rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
        }}
      >
        Share this link with friends. When 3 sign up, all features unlock permanently.
      </p>
    </div>
  );
}
