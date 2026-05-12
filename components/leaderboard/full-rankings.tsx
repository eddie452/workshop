"use client";

/**
 * FullRankings
 *
 * Renders the ranks #5+ list extracted from the shared `Leaderboard`
 * component so the dashboard (#242) can gate it behind a "View All"
 * reveal button without rendering the Champion / Final Four twice.
 *
 * Strategic shift (#288): premium gating was removed. Every user
 * sees the full rankings unconditionally. The `isPremium` /
 * `hasFullRankings` props are retained for backwards compatibility
 * with existing callers but no longer affect rendering.
 */

import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";
import { getAllergenThumbnail } from "@/lib/allergens/thumbnails";
import type { RankedAllergen } from "./types";

export interface FullRankingsProps {
  allergens: RankedAllergen[];
  /** Retained for backwards compatibility; no longer gates rendering. */
  isPremium?: boolean;
  /** Retained for backwards compatibility; no longer gates rendering. */
  hasFullRankings?: boolean;
}

export function FullRankings({ allergens }: FullRankingsProps) {
  // After #288 the server always passes the complete ranked list; treat
  // anything past the champion + Final Four as the Full Rankings slice.
  const fullRankings = allergens.filter((a) => a.rank >= 5);

  if (fullRankings.length === 0) {
    return null;
  }

  return (
    <div>
      {/* "Your Allergen Leaderboard" title (#276) — co-located with the
          list it labels when the dashboard gates Full Rankings behind
          the "View All" reveal. Prior placement above the champion
          orphaned the title. */}
      <h1
        data-testid="full-rankings-title"
        className="mb-2 text-2xl font-bold text-dusty-denim"
      >
        Your Allergen Leaderboard
      </h1>
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
  );
}
