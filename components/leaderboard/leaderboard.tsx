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

import { useState, useEffect } from "react";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { DisclaimerModal } from "@/components/shared/disclaimer-modal";
import { LockIcon } from "@/components/shared";
import { TriggerChampionCard } from "./trigger-champion-card";
import { FinalFour } from "./final-four";
import { EnvironmentalForecast } from "./environmental-forecast";
import type { ForecastData } from "./environmental-forecast";
import { ConfidenceBadge } from "./confidence-badge";
import { ConfidenceBadge as SharedConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";
import { PfasPanel } from "@/components/pfas/pfas-panel";
import type { PfasCrossReactivity } from "@/lib/pfas/types";
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
  /** PFAS cross-reactivity entries for top allergens (optional) */
  pfasEntries?: PfasCrossReactivity[];
}

export function Leaderboard({
  allergens,
  isPremium,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
  pfasEntries = [],
}: LeaderboardClientProps) {
  const [acknowledged, setAcknowledged] = useState(fdaAcknowledged);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Fetch environmental forecast data when in forecast mode
  useEffect(() => {
    if (!isEnvironmentalForecast || !acknowledged) return;

    let cancelled = false;
    setForecastLoading(true);

    fetch(`${window.location.origin}/api/forecast`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setForecastData({
            pollen: data.pollen,
            weather: data.weather,
            aqi: data.aqi,
            region: data.region,
          });
        }
      })
      .catch(() => {
        // Graceful degradation — forecast shows "no data" state
      })
      .finally(() => {
        if (!cancelled) setForecastLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEnvironmentalForecast, acknowledged]);

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
      >
        <h1 className="text-2xl font-bold text-brand-primary-dark">
          Environmental Forecast
        </h1>
        <EnvironmentalForecast data={forecastData} loading={forecastLoading} />
      </div>
    );
  }

  const champion = allergens[0] ?? null;
  const finalFour = allergens.slice(1, 4);

  return (
    <div
      data-testid="leaderboard"
      className="mx-auto max-w-2xl space-y-6 px-4 py-6"
    >
      <h1 className="text-2xl font-bold text-brand-primary-dark">
        Your Allergen Leaderboard
      </h1>

      {/* FDA Disclaimer — always visible */}
      <FdaDisclaimer />

      {/* Trigger Champion */}
      {champion && (
        <div className="mt-6">
          <TriggerChampionCard allergen={champion} />
        </div>
      )}

      {/* Final Four (#2-#4) */}
      {finalFour.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-text-accent">
            Final Four
          </h2>
          <FinalFour allergens={finalFour} isBlurred={!isPremium} />
        </div>
      )}

      {/* Full Ranked List (beyond top 4) */}
      {allergens.length > 4 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-text-accent">
            Full Rankings
          </h2>
          <div
            data-testid="full-rankings"
            className="divide-y divide-brand-border-light rounded-lg border border-brand-border bg-white"
          >
            {allergens.slice(4).map((allergen) => (
              <div
                key={allergen.allergen_id}
                data-testid="ranked-allergen-row"
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-surface-muted text-xs font-bold text-brand-text-muted">
                    #{allergen.rank}
                  </span>
                  <CategoryIcon category={allergen.category} />
                  <span className="text-sm font-medium text-brand-primary-dark">
                    {allergen.common_name}
                  </span>
                </div>
                {isPremium ? (
                  <div
                    data-testid="ranking-score-details"
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs text-brand-text-muted">
                      {allergen.elo_score}
                    </span>
                    <ConfidenceBadge tier={allergen.confidence_tier} />
                    {/* TODO(#156): wire real confidence from engine when available */}
                    <span
                      data-placeholder="true"
                      data-testid="row-confidence-score"
                    >
                      <SharedConfidenceBadge score={0.5} variant="compact" />
                    </span>
                  </div>
                ) : (
                  <div
                    data-testid="ranking-score-locked"
                    className="flex items-center gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary"
                    >
                      <LockIcon size={12} stroke="white" strokeWidth={2.5} />
                    </span>
                    <span className="text-xs font-medium text-brand-primary">
                      Upgrade
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upgrade CTA for free users */}
          {!isPremium && (
            <div
              data-testid="rankings-upgrade-cta"
              className="mt-4"
            >
              <UpgradeCta feature="full ranking details" />
            </div>
          )}
        </div>
      )}

      {/* PFAS Cross-Reactivity Panel */}
      {pfasEntries.length > 0 && (
        <div className="mt-6">
          <PfasPanel entries={pfasEntries} isPremium={isPremium} />
        </div>
      )}
    </div>
  );
}
