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
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";
import { PfasPanel } from "@/components/pfas/pfas-panel";
import type { PfasCrossReactivity } from "@/lib/pfas/types";
import type { RankedAllergen, GatedRankedAllergen } from "./types";

export interface LeaderboardClientProps {
  /** Ranked allergens sorted by Elo descending. */
  allergens: RankedAllergen[];
  /**
   * Optional server-redacted Final Four payload (ranks #2-#4). When
   * provided, these entries are used in place of `allergens[1..4]` for
   * the Final Four section — any `locked: true` entries render as
   * silhouettes because the server stripped their common_name, elo_score,
   * and confidence_tier before serialization. Defense in depth: free
   * users with < 3 referral credits never receive the raw values over
   * the wire. When omitted, the component falls back to deriving the
   * Final Four from `allergens` (backward compatible, used in tests).
   */
  finalFourGated?: GatedRankedAllergen[];
  /**
   * Whether the Final Four reveal is unlocked. True for Pro users or
   * free users with >= 3 referral credits. When undefined, falls back
   * to `isPremium` (backward compatible).
   */
  isFinalFourUnlocked?: boolean;
  /** Current successful referral invite count (0, 1, 2, or 3+). */
  referralCount?: number;
  /** Whether the user has premium access */
  isPremium: boolean;
  /**
   * Granular gate for the Full Rankings section (ranks #5+). When
   * provided, it overrides `isPremium` for the ranks #5+ score reveal
   * and the "Upgrade" CTA below that section. This allows the
   * `full_rankings` feature to be gated independently of other
   * premium features in the future. When omitted, falls back to
   * `isPremium` for backward compatibility with tests and legacy
   * callers.
   */
  hasFullRankings?: boolean;
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
  finalFourGated,
  isFinalFourUnlocked,
  referralCount = 0,
  isPremium,
  hasFullRankings,
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

  // If the server provided a gated payload, use it — it may contain
  // redacted entries. Otherwise derive from the full `allergens` list and
  // mark every entry as unlocked (backward-compatible path for tests and
  // legacy callers).
  const finalFour: GatedRankedAllergen[] =
    finalFourGated ??
    allergens.slice(1, 4).map((a) => ({
      allergen_id: a.allergen_id,
      rank: a.rank,
      category: a.category,
      common_name: a.common_name,
      elo_score: a.elo_score,
      confidence_tier: a.confidence_tier,
      score: a.score,
      locked: false,
    }));

  // Full Rankings (ranks #5+). When a gated payload is supplied, the
  // server stripped ranks #2-#4 from `allergens` to prevent raw values
  // from crossing the wire — in that case, anything past rank 1 is
  // already "#5+". When no gated payload is supplied (legacy/tests), we
  // slice off the first 4 entries (champion + Final Four).
  const fullRankings = finalFourGated
    ? allergens.filter((a) => a.rank >= 5)
    : allergens.slice(4);

  // Unlock gate: explicit server value wins; fall back to premium.
  const finalFourUnlocked = isFinalFourUnlocked ?? isPremium;

  // Full Rankings gate (ranks #5+). Explicit granular check wins; fall
  // back to the blanket `isPremium` flag so existing callers (and the
  // test suite) continue to behave identically until they migrate.
  const fullRankingsUnlocked = hasFullRankings ?? isPremium;

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
          <FinalFour
            allergens={finalFour}
            isUnlocked={finalFourUnlocked}
            referralCount={referralCount}
          />
        </div>
      )}

      {/* Full Ranked List (beyond top 4) */}
      {fullRankings.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-text-accent">
            Full Rankings
          </h2>
          <div
            data-testid="full-rankings"
            className="divide-y divide-brand-border-light rounded-card border border-brand-border bg-white"
          >
            {fullRankings.map((allergen) => (
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
                {fullRankingsUnlocked ? (
                  <div
                    data-testid="ranking-score-details"
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs text-brand-text-muted">
                      {allergen.elo_score}
                    </span>
                    {/* Numeric confidence badge — emitted by the engine per #160. */}
                    <span data-testid="row-confidence-score">
                      <ConfidenceBadge
                        score={allergen.score}
                        variant="compact"
                      />
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
          {!fullRankingsUnlocked && (
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
