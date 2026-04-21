/**
 * Final Four Display
 *
 * Bracket-style display of allergens ranked #2-#4.
 *
 * Two rendering modes:
 *   - Unlocked (Pro or >= 3 referral credits): cards show name, category,
 *     Elo, and confidence tier in full.
 *   - Locked (free tier, < 3 referral credits): ranks 2-4 are redacted
 *     server-side (name/score/tier are null), cards render as plant
 *     silhouettes wrapped in a Dusty Denim BlurOverlay, and the
 *     FinalFourUnlockCta is shown beneath. This is the freemium reveal
 *     mechanic and the growth loop (see #157).
 */

import type { FinalFourProps, GatedRankedAllergen } from "./types";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { CategoryIcon } from "./category-icon";
import { BlurOverlay } from "./blur-overlay";
import { FinalFourUnlockCta } from "./final-four-unlock-cta";
import { getAllergenThumbnail } from "@/lib/allergens/thumbnails";

/** Type guard that narrows `score` from `number | null` to `number`. */
function hasNumericScore(
  allergen: GatedRankedAllergen,
): allergen is GatedRankedAllergen & { score: number } {
  return allergen.score !== null;
}

function FinalFourCard({ allergen }: { allergen: GatedRankedAllergen }) {
  const locked = allergen.locked;
  const thumb = getAllergenThumbnail(allergen.allergen_id);

  return (
    <div
      data-testid="final-four-card"
      data-locked={locked}
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
        {!locked && hasNumericScore(allergen) && (
          <ConfidenceBadge score={allergen.score} variant="compact" />
        )}
      </div>

      {/* Allergen info (silhouette if locked) */}
      <div className="flex items-center gap-2">
        {/* Thumbnail — skip for locked/redacted rows (generic icon next to "???" is meaningless) */}
        {!locked && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumb.src}
            alt={thumb.alt}
            width={48}
            height={48}
            className="h-12 w-12 flex-shrink-0 rounded-xl"
          />
        )}
        <CategoryIcon category={allergen.category} />
        <div>
          <p
            data-testid="final-four-name"
            className={
              locked
                ? "text-sm font-semibold tracking-widest text-dusty-denim"
                : "text-sm font-semibold text-dusty-denim"
            }
          >
            {locked ? "???" : allergen.common_name}
          </p>
          <p
            data-testid="final-four-elo"
            className="text-xs text-dusty-denim"
          >
            {locked ? "Elo —" : `Elo ${allergen.elo_score}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FinalFour({
  allergens,
  isUnlocked,
  referralCount = 0,
  onUnlockCtaImpression,
  onInviteClick,
  onUpgradeClick,
}: FinalFourProps) {
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

  if (isUnlocked) {
    return content;
  }

  return (
    <div data-testid="final-four-locked-wrapper">
      <BlurOverlay>{content}</BlurOverlay>
      <FinalFourUnlockCta
        referralCount={referralCount}
        onImpression={onUnlockCtaImpression}
        onInviteClick={onInviteClick}
        onUpgradeClick={onUpgradeClick}
      />
    </div>
  );
}
