"use client";

/**
 * Leaderboard
 *
 * Main container component for the allergen leaderboard display.
 * Orchestrates the Trigger Champion, Final Four, and full ranked list.
 *
 * Features:
 * - Trigger Champion (#1) always visible
 * - Final Four (#2-4) always visible (premium gating removed in #288)
 * - Full Rankings (#5+) always visible (premium gating removed in #288)
 * - FDA disclaimer always visible
 * - Environmental Forecast mode when severity = 0
 * - First-time FDA acknowledgment gate
 *
 * Naming note: "Final Four" is the tournament-stage brand term (four
 * survivors enter the semifinals). The UI renders three cards because
 * rank #1 is extracted into the Trigger Champion above, leaving #2-#4
 * in this section. Do not rename the user-facing copy.
 */

import { useState, useEffect } from "react";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { DisclaimerModal } from "@/components/shared/disclaimer-modal";
import { TriggerChampionCard } from "./trigger-champion-card";
import { FinalFour } from "./final-four";
import { EnvironmentalForecast } from "./environmental-forecast";
import type { ForecastData } from "./environmental-forecast";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";
import { PfasPanel } from "@/components/pfas/pfas-panel";
import type { PfasCrossReactivity } from "@/lib/pfas/types";
import { getAllergenThumbnail } from "@/lib/allergens/thumbnails";
import type { RankedAllergen, GatedRankedAllergen } from "./types";

export interface LeaderboardClientProps {
  /** Ranked allergens sorted by Elo descending. */
  allergens: RankedAllergen[];
  /** Whether the user has premium access (retained for downstream surfaces; no longer gates Final Four / Full Rankings). */
  isPremium: boolean;
  /**
   * Retained for backwards compatibility with existing call sites; the
   * Full Rankings section is no longer gated in #288 so this prop has
   * no effect on rendering and is treated as always-true.
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
  /**
   * When `false`, the FDA disclaimer block is NOT rendered inside the
   * leaderboard surface. Used by the dashboard (#242) which renders
   * the disclaimer at the very bottom of the page instead of inline.
   * Defaults to `true` for backwards compatibility with existing
   * callers and tests that expect the inline banner.
   */
  showFdaDisclaimer?: boolean;
  /**
   * When `false`, the Full Rankings (ranks #5+) section is NOT
   * rendered. Used by the dashboard (#242) to gate the full list
   * behind a "View All" reveal button owned by the page. Defaults
   * to `true` for backwards compatibility.
   */
  showFullRankings?: boolean;
}

export function Leaderboard({
  allergens,
  isPremium,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
  pfasEntries = [],
  showFdaDisclaimer = true,
  showFullRankings = true,
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
        <h1 className="text-2xl font-bold text-dusty-denim">
          Environmental Forecast
        </h1>
        <EnvironmentalForecast data={forecastData} loading={forecastLoading} />
      </div>
    );
  }

  const champion = allergens[0] ?? null;

  // Strategic shift (#288): the Final Four (ranks #2-#4) is no longer
  // gated. Always render every entry as unlocked.
  const finalFour: GatedRankedAllergen[] = allergens.slice(1, 4).map((a) => ({
    allergen_id: a.allergen_id,
    rank: a.rank,
    category: a.category,
    common_name: a.common_name,
    elo_score: a.elo_score,
    confidence_tier: a.confidence_tier,
    score: a.score,
    locked: false,
  }));

  // Full Rankings (ranks #5+). Server callers historically stripped the
  // Final Four slice from `allergens` before passing it down; the new
  // ungated dashboard passes the full list so we slice off the top 4.
  // Detect either shape by filtering on rank.
  const fullRankings = allergens.filter((a) => a.rank >= 5);

  return (
    <div
      data-testid="leaderboard"
      className="mx-auto max-w-2xl space-y-6 px-4 py-6"
    >
      {/* "Your Allergen Leaderboard" title (#276): only rendered here
          when the Full Rankings list is shown inline. When the parent
          surface (e.g., dashboard #242) gates Full Rankings behind a
          reveal button and suppresses them inline (`showFullRankings
          === false`), the title moves into the FullRankings component
          so it is co-located with the list it labels, not orphaned
          above the champion. */}
      {showFullRankings && (
        <h1 className="text-2xl font-bold text-dusty-denim">
          Your Allergen Leaderboard
        </h1>
      )}

      {/* FDA Disclaimer — always visible unless the parent surface
          has opted to render it elsewhere (see #242, where the
          dashboard moves it to the very bottom of the page). */}
      {showFdaDisclaimer && <FdaDisclaimer />}

      {/* Trigger Champion */}
      {champion && (
        <div className="mt-6">
          <TriggerChampionCard allergen={champion} />
        </div>
      )}

      {/* Final Four (#2-#4) */}
      {finalFour.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-dusty-denim">
            Final Four
          </h2>
          <FinalFour allergens={finalFour} />
        </div>
      )}

      {/* Full Ranked List (beyond top 4). The dashboard (#242) gates
          this behind a "View All" reveal button by passing
          `showFullRankings={false}` until the user opts in. */}
      {showFullRankings && fullRankings.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-dusty-denim">
            Full Rankings
          </h2>
          <div
            data-testid="full-rankings"
            className="divide-y divide-white rounded-card border border-champ-blue bg-white"
          >
            {fullRankings.map((allergen) => {
              const thumb = getAllergenThumbnail(allergen.allergen_id);
              return (
              <div
                key={allergen.allergen_id}
                data-testid="ranked-allergen-row"
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-dusty-denim">
                    #{allergen.rank}
                  </span>
                  {/* Thumbnail — plain <img> for SVG compat, matches bracket-node pattern (#179) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb.src}
                    alt={thumb.alt}
                    width={48}
                    height={48}
                    className="h-12 w-12 flex-shrink-0 rounded-xl"
                  />
                  <CategoryIcon category={allergen.category} />
                  <span className="text-sm font-medium text-dusty-denim">
                    {allergen.common_name}
                  </span>
                </div>
                <div
                  data-testid="ranking-score-details"
                  className="flex items-center gap-2"
                >
                  <span className="text-xs text-dusty-denim">
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
              </div>
              );
            })}
          </div>
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
