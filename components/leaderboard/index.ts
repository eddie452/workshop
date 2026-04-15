/**
 * Leaderboard Components
 *
 * Re-exports for the allergen leaderboard display surface.
 */

export { Leaderboard } from "./leaderboard";
export type { LeaderboardClientProps } from "./leaderboard";

export { TriggerChampionCard } from "./trigger-champion-card";
export { FinalFour } from "./final-four";
export { FinalFourUnlockCta } from "./final-four-unlock-cta";
export type { FinalFourUnlockCtaProps } from "./final-four-unlock-cta";
export { BlurOverlay } from "./blur-overlay";
// Legacy tier-string ConfidenceBadge removed in #160 — import
// `ConfidenceBadge` from `@/components/shared/confidence-badge` for the
// numeric 0–1 variant.
export { CategoryIcon } from "./category-icon";
export { EnvironmentalForecast } from "./environmental-forecast";
export type { ForecastData, EnvironmentalForecastProps } from "./environmental-forecast";

export type {
  RankedAllergen,
  GatedRankedAllergen,
  LeaderboardProps,
  TriggerChampionCardProps,
  FinalFourProps,
  AllergenRankRowProps,
  BlurOverlayProps,
} from "./types";
