"use client";

/**
 * FDA Disclaimer Acknowledgment Modal
 *
 * One-time gate shown before first leaderboard view.
 * Once the user clicks "I Understand", fda_acknowledged is set to true
 * in Supabase and the modal never appears again.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "./fda-disclaimer";

export interface DisclaimerModalProps {
  /** Authenticated user's ID for the Supabase update */
  userId: string;
  /** Called after acknowledgment is persisted successfully */
  onAcknowledge: () => void;
}

export function DisclaimerModal({
  userId,
  onAcknowledge,
}: DisclaimerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAcknowledge() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ fda_acknowledged: true } as never)
        .eq("id", userId);

      if (updateError) {
        setError("Failed to save acknowledgment. Please try again.");
        setLoading(false);
        return;
      }

      onAcknowledge();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fda-modal-title"
      data-testid="disclaimer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-primary-dark/50"
    >
      <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Warning icon */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            &#9888;
          </span>
          <h2
            id="fda-modal-title"
            className="text-lg font-bold text-brand-primary-dark"
          >
            Important Health Disclaimer
          </h2>
        </div>

        {/* Disclaimer label */}
        <p className="mb-3 text-base font-semibold text-brand-primary-dark">
          {FDA_DISCLAIMER_LABEL}
        </p>

        {/* Full disclaimer text */}
        <p className="mb-6 text-sm leading-relaxed text-brand-text-secondary">
          {FDA_DISCLAIMER_FULL_TEXT}
        </p>

        {/* Error message */}
        {error && (
          <p
            data-testid="disclaimer-error"
            className="mb-3 text-sm text-[#055A8C]"
          >
            {error}
          </p>
        )}

        {/* Acknowledge button */}
        <button
          onClick={handleAcknowledge}
          disabled={loading}
          data-testid="acknowledge-button"
          className="w-full rounded-md bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "I Understand"}
        </button>
      </div>
    </div>
  );
}
