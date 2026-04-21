"use client";

/**
 * FullRankings
 *
 * Renders the ranks #5+ list extracted from the shared `Leaderboard`
 * component so the dashboard (#242) can gate it behind a "View All"
 * reveal button without rendering the Champion / Final Four twice.
 *
 * Gating & redaction semantics match the inline implementation in
 * `Leaderboard`:
 *   - When `finalFourGated` is provided, we assume the server stripped
 *     ranks #2-#4 from `allergens` (defense in depth) and treat every
 *     entry with `rank >= 5` as part of the Full Rankings slice.
 *   - When not provided (legacy/tests), we slice off the first four.
 *   - `hasFullRankings` takes precedence over `isPremium` for the
 *     Elo / confidence reveal; when both are undefined or false the
 *     rows render in their locked "Upgrade" state.
 */

import { LockIcon } from "@/components/shared";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";
import { CategoryIcon } from "./category-icon";
import { getAllergenThumbnail } from "@/lib/allergens/thumbnails";
import type { RankedAllergen, GatedRankedAllergen } from "./types";

export interface FullRankingsProps {
  allergens: RankedAllergen[];
  finalFourGated?: GatedRankedAllergen[];
  isPremium: boolean;
  hasFullRankings?: boolean;
}

export function FullRankings({
  allergens,
  finalFourGated,
  isPremium,
  hasFullRankings,
}: FullRankingsProps) {
  const fullRankings = finalFourGated
    ? allergens.filter((a) => a.rank >= 5)
    : allergens.slice(4);

  const fullRankingsUnlocked = hasFullRankings ?? isPremium;

  if (fullRankings.length === 0) {
    return null;
  }

  return (
    <div>
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
              {fullRankingsUnlocked ? (
                <div
                  data-testid="ranking-score-details"
                  className="flex items-center gap-2"
                >
                  <span className="text-xs text-dusty-denim">
                    {allergen.elo_score}
                  </span>
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
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-champ-blue"
                  >
                    <LockIcon size={12} stroke="white" strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-medium text-champ-blue">
                    Upgrade
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!fullRankingsUnlocked && (
        <div data-testid="rankings-upgrade-cta" className="mt-4">
          <UpgradeCta feature="full ranking details" />
        </div>
      )}
    </div>
  );
}
