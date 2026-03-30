/**
 * Symptom-Specificity Weighting
 *
 * Maps user-reported symptom zones to allergen categories, producing
 * a specificity multiplier that boosts allergens whose typical
 * presentation matches the reported symptoms.
 *
 * Server-side only — never import from client components.
 *
 * Zone → Category mapping:
 *   eyes    → tree, grass (pollen conjunctivitis)
 *   nose    → tree, grass, weed (allergic rhinitis)
 *   throat  → mold, tree (post-nasal drip, spore irritation)
 *   skin    → indoor, food (contact dermatitis, hives)
 *   lungs   → mold, indoor (asthma, spore inhalation, SPP)
 *   stomach → food (PFAS cross-reactivity, GI symptoms)
 */

import type { SymptomZone, SymptomInput, SymptomMultiplierResult } from "./types";

/* ------------------------------------------------------------------ */
/* Zone → Category mapping                                             */
/* ------------------------------------------------------------------ */

/**
 * Maps each symptom zone to the allergen categories it indicates.
 * An allergen matching more zones gets a higher multiplier.
 */
const ZONE_CATEGORY_MAP: Record<SymptomZone, string[]> = {
  eyes: ["tree", "grass"],
  nose: ["tree", "grass", "weed"],
  throat: ["mold", "tree"],
  skin: ["indoor", "food"],
  lungs: ["mold", "indoor"],
  stomach: ["food"],
};

/* ------------------------------------------------------------------ */
/* Multiplier constants                                                */
/* ------------------------------------------------------------------ */

/**
 * Base multiplier when no zones match (neutral — no boost, no penalty).
 */
const BASE_MULTIPLIER = 1.0;

/**
 * Boost per matching zone. Stacks additively.
 * 1 zone match  → 1.0 + 0.3 = 1.3x
 * 2 zone matches → 1.0 + 0.6 = 1.6x
 * 3 zone matches → 1.0 + 0.9 = 1.9x
 */
const ZONE_MATCH_BOOST = 0.3;

/**
 * Maximum multiplier cap to prevent runaway scoring.
 */
const MAX_MULTIPLIER = 2.5;

/* ------------------------------------------------------------------ */
/* Symptom Gate                                                        */
/* ------------------------------------------------------------------ */

/**
 * Check the global symptom gate.
 *
 * When global_severity is 0 (no symptoms), all Elo weights are
 * suppressed. The leaderboard switches to Environmental Forecast mode.
 *
 * @param symptoms — symptom input with global severity
 * @returns true if symptoms are present (gate passes), false if suppressed
 */
export function checkSymptomGate(symptoms: SymptomInput): boolean {
  return symptoms.global_severity > 0;
}

/* ------------------------------------------------------------------ */
/* Specificity Multiplier                                              */
/* ------------------------------------------------------------------ */

/**
 * Calculate symptom-specificity multiplier for a single allergen.
 *
 * Compares the allergen's category against the reported symptom zones.
 * Each matching zone adds ZONE_MATCH_BOOST to the base multiplier.
 *
 * @param allergenCategory — the allergen's category (tree, grass, weed, mold, indoor, food)
 * @param reportedZones    — symptom zones the user reported
 * @returns { multiplier, matching_zones }
 */
export function calculateSymptomMultiplier(
  allergenCategory: string,
  reportedZones: SymptomZone[],
): { multiplier: number; matching_zones: SymptomZone[] } {
  if (reportedZones.length === 0) {
    return { multiplier: BASE_MULTIPLIER, matching_zones: [] };
  }

  const matchingZones: SymptomZone[] = [];

  for (const zone of reportedZones) {
    const categories = ZONE_CATEGORY_MAP[zone];
    if (categories.includes(allergenCategory)) {
      matchingZones.push(zone);
    }
  }

  const rawMultiplier =
    BASE_MULTIPLIER + matchingZones.length * ZONE_MATCH_BOOST;
  const multiplier = Math.min(rawMultiplier, MAX_MULTIPLIER);

  return { multiplier, matching_zones: matchingZones };
}

/**
 * Calculate symptom-specificity multipliers for all allergens.
 *
 * If the symptom gate fails (global_severity === 0), all multipliers
 * are set to 0.0 (complete suppression).
 *
 * @param allergens — array of { allergen_id, category }
 * @param symptoms  — symptom input with zones and global severity
 * @returns array of multiplier results
 */
export function getAllSymptomMultipliers(
  allergens: { allergen_id: string; category: string }[],
  symptoms: SymptomInput,
): SymptomMultiplierResult[] {
  const gateOpen = checkSymptomGate(symptoms);

  return allergens.map(({ allergen_id, category }) => {
    if (!gateOpen) {
      return {
        allergen_id,
        multiplier: 0.0,
        matching_zones: [],
      };
    }

    const { multiplier, matching_zones } = calculateSymptomMultiplier(
      category,
      symptoms.zones,
    );

    return {
      allergen_id,
      multiplier,
      matching_zones,
    };
  });
}
