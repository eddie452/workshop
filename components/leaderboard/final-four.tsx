/**
 * Final Four Display
 *
 * Bracket-style display of allergens ranked #2-#4.
 * Free-tier users see these blurred; premium users see them clearly.
 */

import type { FinalFourProps } from "./types";
import { ConfidenceBadge } from "./confidence-badge";
import { CategoryIcon } from "./category-icon";
import { BlurOverlay } from "./blur-overlay";
import type { RankedAllergen } from "./types";

function FinalFourCard({ allergen }: { allergen: RankedAllergen }) {
  return (
    <div
      data-testid="final-four-card"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      {/* Rank badge */}
      <div className="mb-2 flex items-center justify-between">
        <span
          data-testid="final-four-rank"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
        >
          #{allergen.rank}
        </span>
        <ConfidenceBadge tier={allergen.confidence_tier} />
      </div>

      {/* Allergen info */}
      <div className="flex items-center gap-2">
        <CategoryIcon category={allergen.category} />
        <div>
          <p
            data-testid="final-four-name"
            className="text-sm font-semibold text-gray-900"
          >
            {allergen.common_name}
          </p>
          <p
            data-testid="final-four-elo"
            className="text-xs text-gray-500"
          >
            Elo {allergen.elo_score}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FinalFour({ allergens, isBlurred }: FinalFourProps) {
  if (allergens.length === 0) return null;

  const content = (
    <div
      data-testid="final-four-grid"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {allergens.map((allergen) => (
        <FinalFourCard key={allergen.allergen_id} allergen={allergen} />
      ))}
    </div>
  );

  if (isBlurred) {
    return <BlurOverlay>{content}</BlurOverlay>;
  }

  return content;
}
