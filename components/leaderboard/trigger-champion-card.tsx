/**
 * Trigger Champion Card
 *
 * Prominently displays the #1 ranked allergen — the user's
 * "Trigger Champion". This is always visible, even on free tier.
 */

import type { TriggerChampionCardProps } from "./types";
import { ConfidenceBadge } from "./confidence-badge";
import { ConfidenceBadge as SharedConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";

export function TriggerChampionCard({ allergen }: TriggerChampionCardProps) {
  return (
    <div
      data-testid="trigger-champion-card"
      className="rounded-xl border-2 border-brand-primary bg-gradient-to-br from-[#E0F5FB] to-[#D6F0F8] p-6 shadow-lg"
    >
      {/* Champion header — white icon on blue circle per brand guide */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary"
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4L6 12H18L22 4M6 12L4 20H20L18 12M12 4V2M8 4L7 2M16 4L17 2" />
          </svg>
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-primary-dark">
          Trigger Champion
        </h2>
      </div>

      {/* Allergen name + category */}
      <div className="mb-3 flex items-center gap-3">
        <CategoryIcon category={allergen.category} />
        <h3
          data-testid="champion-name"
          className="text-2xl font-bold text-brand-primary-dark"
        >
          {allergen.common_name}
        </h3>
      </div>

      {/* Elo score + confidence */}
      <div className="flex items-center gap-3">
        <span
          data-testid="champion-elo"
          className="text-lg font-semibold text-brand-text-accent"
        >
          Elo {allergen.elo_score}
        </span>
        <ConfidenceBadge tier={allergen.confidence_tier} />
        {/* Confidence score will render when RankedAllergen carries a numeric confidence field (see issue #160) */}
        <span data-testid="champion-confidence-score">
          <SharedConfidenceBadge score={null} variant="full" />
        </span>
      </div>
    </div>
  );
}
