/**
 * CCRS (Cross-Reactivity Confidence Rating System) Gate
 *
 * 3-layer cockroach-specific gate that determines whether the
 * cockroach allergen should be included in tournament scoring.
 * ALL three layers must pass for cockroach to be scored.
 *
 * Layer 1: Global symptom present (severity > 0)
 * Layer 2: Indoor pattern detected (mostly_indoors = true)
 * Layer 3: CCRS score > 0 (home profile indicates cockroach risk)
 *
 * Server-side only — never import from client components.
 */

import type { CCRSInput, CCRSResult } from "./types";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** The allergen ID for cockroach */
export const COCKROACH_ALLERGEN_ID = "cockroach";

/**
 * CCRS multiplier tiers based on CCRS score.
 * Higher CCRS = stronger indoor cockroach risk signal.
 */
const CCRS_MULTIPLIER_TIERS: { min: number; multiplier: number }[] = [
  { min: 75, multiplier: 2.0 },
  { min: 50, multiplier: 1.5 },
  { min: 25, multiplier: 1.2 },
  { min: 1, multiplier: 1.0 },
];

const CCRS_BLOCKED_MULTIPLIER = 0.0;

/* ------------------------------------------------------------------ */
/* Gate check                                                          */
/* ------------------------------------------------------------------ */

/**
 * Run the 3-layer CCRS cockroach gate.
 *
 * All three conditions must be true for cockroach to pass:
 * 1. Global symptom severity > 0 (symptoms present)
 * 2. Indoor pattern detected (mostly_indoors = true)
 * 3. CCRS score > 0 (home profile indicates cockroach risk)
 *
 * @param input — CCRS gate input data
 * @returns CCRSResult with pass/fail status and multiplier
 */
export function checkCCRSGate(input: CCRSInput): CCRSResult {
  const failed_layers: string[] = [];

  // Layer 1: Global symptom gate
  if (input.global_severity <= 0) {
    failed_layers.push("symptom_gate");
  }

  // Layer 2: Indoor pattern
  if (!input.mostly_indoors) {
    failed_layers.push("indoor_pattern");
  }

  // Layer 3: CCRS score > 0
  if (input.ccrs <= 0) {
    failed_layers.push("ccrs_score");
  }

  const passes = failed_layers.length === 0;
  const multiplier = passes
    ? getCCRSMultiplier(input.ccrs)
    : CCRS_BLOCKED_MULTIPLIER;

  return { passes, failed_layers, multiplier };
}

/* ------------------------------------------------------------------ */
/* Multiplier lookup                                                   */
/* ------------------------------------------------------------------ */

/**
 * Get the CCRS multiplier based on the CCRS score.
 * Higher CCRS = stronger cockroach risk = higher multiplier.
 *
 * @param ccrs — CCRS score (0-100)
 * @returns multiplier value
 */
export function getCCRSMultiplier(ccrs: number): number {
  for (const { min, multiplier } of CCRS_MULTIPLIER_TIERS) {
    if (ccrs >= min) return multiplier;
  }
  return CCRS_BLOCKED_MULTIPLIER;
}

/**
 * Determine whether an allergen is cockroach and should be gated.
 *
 * @param allergenId — the allergen identifier
 * @returns true if this is the cockroach allergen
 */
export function isCockroachAllergen(allergenId: string): boolean {
  return allergenId === COCKROACH_ALLERGEN_ID;
}

/**
 * Apply CCRS gate to a cockroach allergen's score.
 * Non-cockroach allergens pass through with multiplier 1.0.
 *
 * @param allergenId — the allergen identifier
 * @param ccrsInput — CCRS gate input
 * @returns multiplier to apply (0 if blocked, positive otherwise)
 */
export function applyCCRSGate(
  allergenId: string,
  ccrsInput: CCRSInput,
): number {
  if (!isCockroachAllergen(allergenId)) return 1.0;
  const result = checkCCRSGate(ccrsInput);
  return result.multiplier;
}
