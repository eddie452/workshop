"use client";

/**
 * FDA Disclaimer Acknowledgment Modal
 *
 * One-time gate shown before first leaderboard view.
 * Once the user clicks "I Understand", fda_acknowledged is set to true
 * in Supabase and the modal never appears again.
 *
 * This component:
 * - Renders a full-screen overlay with the FDA disclaimer
 * - Blocks interaction with the page behind it
 * - Cannot be dismissed without clicking "I Understand"
 * - Calls onAcknowledge callback after Supabase update succeeds
 *
 * Usage:
 *   <DisclaimerModal
 *     userId={user.id}
 *     onAcknowledge={() => setAcknowledged(true)}
 *   />
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic inference
      const { error: updateError } = await (supabase as any)
        .from("user_profiles")
        .update({ fda_acknowledged: true })
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl"
        style={{
          maxWidth: "28rem",
          margin: "0 1rem",
          backgroundColor: "#ffffff",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          boxShadow:
            "0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)",
        }}
      >
        {/* Warning icon */}
        <div
          className="mb-4 flex items-center gap-2"
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            className="text-2xl"
            style={{ fontSize: "1.5rem" }}
            aria-hidden="true"
          >
            &#9888;
          </span>
          <h2
            id="fda-modal-title"
            className="text-lg font-bold text-gray-900"
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Important Health Disclaimer
          </h2>
        </div>

        {/* Disclaimer label */}
        <p
          className="mb-3 text-base font-semibold text-amber-800"
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#92400e",
            marginBottom: "0.75rem",
          }}
        >
          {FDA_DISCLAIMER_LABEL}
        </p>

        {/* Full disclaimer text */}
        <p
          className="mb-6 text-sm leading-relaxed text-gray-600"
          style={{
            fontSize: "0.875rem",
            lineHeight: 1.625,
            color: "#4b5563",
            marginBottom: "1.5rem",
          }}
        >
          {FDA_DISCLAIMER_FULL_TEXT}
        </p>

        {/* Error message */}
        {error && (
          <p
            data-testid="disclaimer-error"
            className="mb-3 text-sm text-red-600"
            style={{
              fontSize: "0.875rem",
              color: "#dc2626",
              marginBottom: "0.75rem",
            }}
          >
            {error}
          </p>
        )}

        {/* Acknowledge button */}
        <button
          onClick={handleAcknowledge}
          disabled={loading}
          data-testid="acknowledge-button"
          className="w-full rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          style={{
            width: "100%",
            borderRadius: "0.375rem",
            backgroundColor: loading ? "#d97706" : "#d97706",
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#ffffff",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Saving..." : "I Understand"}
        </button>
      </div>
    </div>
  );
}
