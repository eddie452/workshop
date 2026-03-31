/**
 * Trigger Champion Card
 *
 * Prominently displays the #1 ranked allergen — the user's
 * "Trigger Champion". This is always visible, even on free tier.
 */

import type { TriggerChampionCardProps } from "./types";
import { ConfidenceBadge } from "./confidence-badge";
import { CategoryIcon } from "./category-icon";

export function TriggerChampionCard({ allergen }: TriggerChampionCardProps) {
  return (
    <div
      data-testid="trigger-champion-card"
      className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg"
    >
      {/* Crown / header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          &#x1F451;
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700">
          Trigger Champion
        </h2>
      </div>

      {/* Allergen name + category */}
      <div className="mb-3 flex items-center gap-3">
        <CategoryIcon category={allergen.category} />
        <h3
          data-testid="champion-name"
          className="text-2xl font-bold text-gray-900"
        >
          {allergen.common_name}
        </h3>
      </div>

      {/* Elo score + confidence */}
      <div className="flex items-center gap-3">
        <span
          data-testid="champion-elo"
          className="text-lg font-semibold text-gray-700"
        >
          Elo {allergen.elo_score}
        </span>
        <ConfidenceBadge tier={allergen.confidence_tier} />
      </div>
    </div>
  );
}
