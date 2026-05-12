/**
 * Final Four Display
 *
 * Bracket-style display of allergens ranked #2-#4.
 *
 * Strategic shift (#288): the Final Four is no longer gated. Every
 * card always renders with full data — name, category, Elo, and
 * confidence tier. The previous locked/blurred branch and the
 * referral / Madness+ unlock CTA were removed.
 */

import type { FinalFourProps, GatedRankedAllergen } from "./types";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";
import { getAllergenThumbnail } from "@/lib/allergens/thumbnails";

/** Type guard that narrows `score` from `number | null` to `number`. */
function hasNumericScore(
  allergen: GatedRankedAllergen,
): allergen is GatedRankedAllergen & { score: number } {
  return allergen.score !== null;
}

function FinalFourCard({ allergen }: { allergen: GatedRankedAllergen }) {
  const thumb = getAllergenThumbnail(allergen.allergen_id);

  return (
    <div
      data-testid="final-four-card"
      data-locked={false}
      className="rounded-card border border-champ-blue bg-white p-4 shadow-sm"
    >
      {/* Rank badge */}
      <div className="mb-2 flex items-center justify-between">
        <span
          data-testid="final-four-rank"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-dusty-denim"
        >
          #{allergen.rank}
        </span>
        {hasNumericScore(allergen) && (
          <ConfidenceBadge score={allergen.score} variant="compact" />
        )}
      </div>

      {/* Allergen info */}
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb.src}
          alt={thumb.alt}
          width={48}
          height={48}
          className="h-12 w-12 flex-shrink-0 rounded-xl"
        />
        <CategoryIcon category={allergen.category} />
        <div>
          <p
            data-testid="final-four-name"
            className="text-sm font-semibold text-dusty-denim"
          >
            {allergen.common_name}
          </p>
          <p
            data-testid="final-four-elo"
            className="text-xs text-dusty-denim"
          >
            {allergen.elo_score !== null ? `Elo ${allergen.elo_score}` : "Elo —"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FinalFour({ allergens }: FinalFourProps) {
  if (allergens.length === 0) return null;

  return (
    <div
      data-testid="final-four-grid"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {allergens.map((allergen) => (
        <FinalFourCard key={allergen.allergen_id} allergen={allergen} />
      ))}
    </div>
  );
}
