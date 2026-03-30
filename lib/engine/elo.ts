/**
 * Elo Scoring Engine
 *
 * Implements Elo initialization from prior probability P(S),
 * K-factor decay, and bounded rating updates.
 *
 * Server-side only — never import from client components.
 *
 * Formulas:
 *   Initial Elo = ELO_CENTER + (P(S) - 0.5) * ELO_SPREAD
 *   P(S) = base_elo * regional_presence / normalizer
 *   K-factor = K_MAX / (1 + K_DECAY * total_signals)
 *   New Elo = clamp(old_elo + K * weighted_delta, ELO_MIN, ELO_MAX)
 */

import type { Region } from "@/lib/supabase/types";
import type { Allergen, AllergenElo, EloUpdate } from "./types";
import { ELO_MIN, ELO_MAX, ELO_CENTER } from "./types";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * Spread factor for mapping P(S) [0,1] to Elo range.
 * With ELO_CENTER=1000 and SPREAD=800:
 *   P(S)=0.0 → Elo 600
 *   P(S)=0.5 → Elo 1000
 *   P(S)=1.0 → Elo 1400
 */
const ELO_SPREAD = 800;

/**
 * K-factor parameters.
 * K starts high (volatile early) and decays toward K_MIN as signals grow.
 *   K = K_MAX / (1 + K_DECAY * total_signals)
 *   Clamped at K_MIN to prevent total stagnation.
 */
const K_MAX = 64;
const K_MIN = 8;
const K_DECAY = 0.1;

/* ------------------------------------------------------------------ */
/* Region → field mapping                                              */
/* ------------------------------------------------------------------ */

const REGION_FIELD_MAP: Record<Region, keyof Allergen> = {
  Northeast: "region_northeast",
  Midwest: "region_midwest",
  Northwest: "region_northwest",
  "South Central": "region_south_central",
  Southeast: "region_southeast",
  Southwest: "region_southwest",
};

/* ------------------------------------------------------------------ */
/* Prior Probability P(S)                                              */
/* ------------------------------------------------------------------ */

/**
 * Calculate prior probability P(S) for an allergen in a given region.
 *
 * P(S) = (base_elo * regional_presence) / normalizer
 *
 * Where normalizer ensures all P(S) values sum to 1 across the
 * allergen set for the region.
 *
 * @param allergen   — allergen record with base_elo and regional presence
 * @param region     — user's home region
 * @param allAllergens — full allergen set (needed for normalization)
 * @returns P(S) in range [0, 1]
 */
export function calculatePriorProbability(
  allergen: Allergen,
  region: Region,
  allAllergens: Allergen[],
): number {
  const field = REGION_FIELD_MAP[region];
  const rawScore =
    allergen.base_elo * (allergen[field] as number);

  const totalScore = allAllergens.reduce((sum, a) => {
    return sum + a.base_elo * (a[field] as number);
  }, 0);

  if (totalScore === 0) return 0;
  return rawScore / totalScore;
}

/* ------------------------------------------------------------------ */
/* Elo Initialization                                                  */
/* ------------------------------------------------------------------ */

/**
 * Initialize Elo rating for an allergen based on its prior probability.
 *
 * Elo_init = ELO_CENTER + (P(S) - 0.5) * ELO_SPREAD
 *
 * Clamped to [ELO_MIN, ELO_MAX].
 *
 * @param priorProbability — P(S) in [0, 1]
 * @returns initial Elo score
 */
export function initializeElo(priorProbability: number): number {
  const raw = ELO_CENTER + (priorProbability - 0.5) * ELO_SPREAD;
  return clampElo(raw);
}

/**
 * Initialize Elo ratings for all allergens in a region.
 *
 * @param allergens — full allergen set
 * @param region    — user's home region
 * @returns array of { allergen_id, elo_score, positive_signals: 0, negative_signals: 0 }
 */
export function initializeAllElo(
  allergens: Allergen[],
  region: Region,
): AllergenElo[] {
  return allergens.map((allergen) => {
    const pS = calculatePriorProbability(allergen, region, allergens);
    return {
      allergen_id: allergen.id,
      elo_score: initializeElo(pS),
      positive_signals: 0,
      negative_signals: 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* K-Factor                                                            */
/* ------------------------------------------------------------------ */

/**
 * Calculate K-factor based on total check-in signals.
 *
 * K = max(K_MIN, K_MAX / (1 + K_DECAY * total_signals))
 *
 * Early check-ins have high K (volatile ratings),
 * later check-ins stabilize with low K.
 *
 * @param totalSignals — positive_signals + negative_signals
 * @returns K-factor
 */
export function calculateKFactor(totalSignals: number): number {
  const k = K_MAX / (1 + K_DECAY * totalSignals);
  return Math.max(K_MIN, k);
}

/* ------------------------------------------------------------------ */
/* Elo Update                                                          */
/* ------------------------------------------------------------------ */

/**
 * Update Elo rating for an allergen based on a weighted delta.
 *
 * New Elo = clamp(current_elo + K * weighted_delta, ELO_MIN, ELO_MAX)
 *
 * weighted_delta is the product of seasonal and symptom multipliers
 * applied to a base signal (+1 for positive, -1 for negative).
 *
 * @param current      — current Elo record
 * @param weightedDelta — combined signal after multipliers (can be negative)
 * @returns EloUpdate with new score, delta applied, and K-factor used
 */
export function updateElo(
  current: AllergenElo,
  weightedDelta: number,
): EloUpdate {
  const totalSignals = current.positive_signals + current.negative_signals;
  const k = calculateKFactor(totalSignals);
  const delta = k * weightedDelta;
  const newElo = clampElo(current.elo_score + delta);

  return {
    allergen_id: current.allergen_id,
    new_elo: newElo,
    delta: newElo - current.elo_score,
    k_factor: k,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Clamp Elo score to valid bounds [ELO_MIN, ELO_MAX].
 */
export function clampElo(elo: number): number {
  return Math.round(Math.max(ELO_MIN, Math.min(ELO_MAX, elo)));
}
