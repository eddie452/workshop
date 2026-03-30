/**
 * Elo → Confidence Tier Mapping
 *
 * Maps final Elo scores to human-readable confidence tiers
 * for display on the leaderboard and in reports.
 *
 * Server-side only — never import from client components.
 *
 * Tier thresholds (centered at 1000):
 *   very_high : Elo >= 1400 — strong evidence this is a trigger
 *   high      : 1200 <= Elo < 1400 — likely trigger
 *   medium    : 900 <= Elo < 1200 — possible trigger
 *   low       : Elo < 900 — unlikely trigger
 */

import type { ConfidenceTier, ConfidenceResult } from "./types";

/* ------------------------------------------------------------------ */
/* Thresholds                                                          */
/* ------------------------------------------------------------------ */

/**
 * Confidence tier boundaries.
 * Order matters — checked from highest to lowest.
 */
const TIER_THRESHOLDS: { min: number; tier: ConfidenceTier }[] = [
  { min: 1400, tier: "very_high" },
  { min: 1200, tier: "high" },
  { min: 900, tier: "medium" },
];

const DEFAULT_TIER: ConfidenceTier = "low";

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

/**
 * Map an Elo score to a confidence tier.
 *
 * @param eloScore — current Elo rating
 * @returns confidence tier
 */
export function getConfidenceTier(eloScore: number): ConfidenceTier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (eloScore >= min) return tier;
  }
  return DEFAULT_TIER;
}

/**
 * Map multiple allergens' Elo scores to confidence tiers.
 *
 * @param allergenElos — array of { allergen_id, elo_score }
 * @returns array of { allergen_id, elo_score, tier }
 */
export function getAllConfidenceTiers(
  allergenElos: { allergen_id: string; elo_score: number }[],
): ConfidenceResult[] {
  return allergenElos.map(({ allergen_id, elo_score }) => ({
    allergen_id,
    elo_score,
    tier: getConfidenceTier(elo_score),
  }));
}

/**
 * Get a human-readable label for a confidence tier.
 *
 * @param tier — confidence tier
 * @returns display label
 */
export function getConfidenceLabel(tier: ConfidenceTier): string {
  const labels: Record<ConfidenceTier, string> = {
    very_high: "Very High",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return labels[tier];
}
