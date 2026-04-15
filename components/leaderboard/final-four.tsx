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
import { ConfidenceBadge } from "./confidence-badge";
import { CategoryIcon } from "./category-icon";
import { BlurOverlay } from "./blur-overlay";
import { FinalFourUnlockCta } from "./final-four-unlock-cta";

function FinalFourCard({ allergen }: { allergen: GatedRankedAllergen }) {
  const locked = allergen.locked;

  return (
    <div
      data-testid="final-four-card"
      data-locked={locked}
      className="rounded-card border border-brand-border bg-white p-4 shadow-sm"
    >
      {/* Rank badge */}
      <div className="mb-2 flex items-center justify-between">
        <span
          data-testid="final-four-rank"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface-muted text-xs font-bold text-brand-text-secondary"
        >
          #{allergen.rank}
        </span>
        {!locked && allergen.confidence_tier && (
          <ConfidenceBadge tier={allergen.confidence_tier} />
        )}
      </div>

      {/* Allergen info (silhouette if locked) */}
      <div className="flex items-center gap-2">
        <CategoryIcon category={allergen.category} />
        <div>
          <p
            data-testid="final-four-name"
            className={
              locked
                ? "text-sm font-semibold tracking-widest text-brand-text-muted"
                : "text-sm font-semibold text-brand-primary-dark"
            }
          >
            {locked ? "???" : allergen.common_name}
          </p>
          <p
            data-testid="final-four-elo"
            className="text-xs text-brand-text-muted"
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
