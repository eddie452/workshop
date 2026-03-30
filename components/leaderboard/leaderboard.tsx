"use client";

/**
 * Leaderboard
 *
 * Main container component for the allergen leaderboard display.
 * Orchestrates the Trigger Champion, Final Four, and full ranked list.
 *
 * Features:
 * - Trigger Champion (#1) always visible
 * - Final Four (#2-4) blurred for free tier, visible for premium
 * - FDA disclaimer always visible
 * - Environmental Forecast mode when severity = 0
 * - First-time FDA acknowledgment gate
 */

import { useState } from "react";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { DisclaimerModal } from "@/components/shared/disclaimer-modal";
import { TriggerChampionCard } from "./trigger-champion-card";
import { FinalFour } from "./final-four";
import { EnvironmentalForecast } from "./environmental-forecast";
import { ConfidenceBadge } from "./confidence-badge";
import { CategoryIcon } from "./category-icon";
import type { RankedAllergen } from "./types";

export interface LeaderboardClientProps {
  /** Ranked allergens sorted by Elo descending */
  allergens: RankedAllergen[];
  /** Whether the user has premium access */
  isPremium: boolean;
  /** Whether severity is 0 (Environmental Forecast mode) */
  isEnvironmentalForecast: boolean;
  /** Whether the user has already acknowledged the FDA disclaimer */
  fdaAcknowledged: boolean;
  /** Authenticated user ID */
  userId: string;
}

export function Leaderboard({
  allergens,
  isPremium,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
}: LeaderboardClientProps) {
  const [acknowledged, setAcknowledged] = useState(fdaAcknowledged);

  // First-time gate: must acknowledge FDA disclaimer
  if (!acknowledged) {
    return (
      <DisclaimerModal
        userId={userId}
        onAcknowledge={() => setAcknowledged(true)}
      />
    );
  }

  // Environmental Forecast mode when severity = 0
  if (isEnvironmentalForecast) {
    return (
      <div
        data-testid="leaderboard"
        className="mx-auto max-w-2xl space-y-6 px-4 py-6"
        style={{
          maxWidth: "42rem",
          margin: "0 auto",
          padding: "1.5rem 1rem",
        }}
      >
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Your Allergen Leaderboard
        </h1>
        <FdaDisclaimer />
        <EnvironmentalForecast />
      </div>
    );
  }

  const champion = allergens[0] ?? null;
  const finalFour = allergens.slice(1, 4);

  return (
    <div
      data-testid="leaderboard"
      className="mx-auto max-w-2xl space-y-6 px-4 py-6"
      style={{
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "1.5rem 1rem",
      }}
    >
      <h1
        className="text-2xl font-bold text-gray-900"
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 1.5rem 0",
        }}
      >
        Your Allergen Leaderboard
      </h1>

      {/* FDA Disclaimer — always visible */}
      <FdaDisclaimer />

      {/* Trigger Champion */}
      {champion && (
        <div style={{ marginTop: "1.5rem" }}>
          <TriggerChampionCard allergen={champion} />
        </div>
      )}

      {/* Final Four (#2-#4) */}
      {finalFour.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2
            className="mb-3 text-lg font-semibold text-gray-800"
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#1f2937",
              marginBottom: "0.75rem",
            }}
          >
            Final Four
          </h2>
          <FinalFour allergens={finalFour} isBlurred={!isPremium} />
        </div>
      )}

      {/* Full Ranked List (beyond top 4) */}
      {allergens.length > 4 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2
            className="mb-3 text-lg font-semibold text-gray-800"
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#1f2937",
              marginBottom: "0.75rem",
            }}
          >
            Full Rankings
          </h2>
          <div
            data-testid="full-rankings"
            className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white"
            style={{
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              overflow: "hidden",
            }}
          >
            {allergens.slice(4).map((allergen) => (
              <div
                key={allergen.allergen_id}
                data-testid="ranked-allergen-row"
                className="flex items-center justify-between px-4 py-3"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500"
                    style={{
                      display: "flex",
                      height: "1.75rem",
                      width: "1.75rem",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "9999px",
                      backgroundColor: "#f3f4f6",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#6b7280",
                    }}
                  >
                    #{allergen.rank}
                  </span>
                  <CategoryIcon category={allergen.category} />
                  <span
                    className="text-sm font-medium text-gray-900"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#111827",
                    }}
                  >
                    {allergen.common_name}
                  </span>
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    className="text-xs text-gray-500"
                    style={{ fontSize: "0.75rem", color: "#6b7280" }}
                  >
                    {allergen.elo_score}
                  </span>
                  <ConfidenceBadge tier={allergen.confidence_tier} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
