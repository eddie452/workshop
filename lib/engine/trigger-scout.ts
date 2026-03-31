/**
 * Trigger Scout — Plant Photo Identification Engine
 *
 * Matches Google Cloud Vision AI labels against allergen seed data
 * to identify nearby allergen-producing plants. When a match is found
 * and conditions are met (symptoms present + seasonal confirmation),
 * a 2.5x Elo proximity multiplier is applied.
 *
 * If conditions are NOT met, the scan is saved with a "dormant" badge
 * and the multiplier is deferred until conditions are satisfied.
 *
 * Server-side only — never import from client components.
 */

import type { VisionLabel } from "@/lib/apis/vision";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Allergen seed entry with vision labels for matching */
export interface ScoutAllergenSeed {
  id: string;
  common_name: string;
  category: string;
  /** Vision AI labels that identify this allergen source */
  vision_labels: string[];
  /** Minimum confidence threshold for a valid match */
  vision_min_confidence: number;
}

/** A matched allergen from a Trigger Scout scan */
export interface ScoutMatch {
  /** Allergen ID from the seed data */
  allergen_id: string;
  /** Common name of the matched allergen */
  common_name: string;
  /** Category (tree, grass, weed, mold, indoor) */
  category: string;
  /** The Vision label that triggered the match */
  matched_label: string;
  /** Confidence score of the matched label (0.0 - 1.0) */
  confidence: number;
}

/** Conditions required for the proximity multiplier */
export interface ScoutConditions {
  /** Whether the user has reported symptoms (global_severity > 0) */
  symptoms_present: boolean;
  /** Whether the allergen is seasonally active in the user's region */
  seasonal_active: boolean;
}

/** Result of a Trigger Scout scan analysis */
export interface ScoutScanResult {
  /** All matched allergens from the scan */
  matches: ScoutMatch[];
  /** Allergen IDs that qualify for the 2.5x proximity multiplier */
  active_allergen_ids: string[];
  /** Allergen IDs with dormant scans (conditions not met) */
  dormant_allergen_ids: string[];
  /** Whether any active matches were found */
  has_active_matches: boolean;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * Elo proximity multiplier applied when ALL conditions are met:
 * 1. Vision AI match above confidence threshold
 * 2. Symptoms present (global_severity > 0)
 * 3. Seasonal confirmation (allergen is active this month/region)
 */
export const TRIGGER_SCOUT_PROXIMITY_MULTIPLIER = 2.5;

/* ------------------------------------------------------------------ */
/* Label matching                                                      */
/* ------------------------------------------------------------------ */

/**
 * Match Vision AI labels against a single allergen's vision_labels.
 *
 * Uses substring matching to account for Vision AI returning broader
 * labels (e.g., "tree" in "oak tree"). Returns the best match (highest
 * confidence) if multiple labels match.
 *
 * @param visionLabels — labels from the Vision API
 * @param allergen — allergen seed entry with vision_labels
 * @returns the best matching label, or null if no match above threshold
 */
export function matchLabelsToAllergen(
  visionLabels: VisionLabel[],
  allergen: ScoutAllergenSeed,
): ScoutMatch | null {
  if (allergen.vision_labels.length === 0) return null;

  let bestMatch: ScoutMatch | null = null;

  for (const visionLabel of visionLabels) {
    // Skip labels below the allergen's minimum confidence
    if (visionLabel.score < allergen.vision_min_confidence) continue;

    for (const seedLabel of allergen.vision_labels) {
      // Case-insensitive substring match in both directions
      const visionDesc = visionLabel.description.toLowerCase();
      const seedDesc = seedLabel.toLowerCase();

      if (visionDesc.includes(seedDesc) || seedDesc.includes(visionDesc)) {
        if (!bestMatch || visionLabel.score > bestMatch.confidence) {
          bestMatch = {
            allergen_id: allergen.id,
            common_name: allergen.common_name,
            category: allergen.category,
            matched_label: visionLabel.description,
            confidence: visionLabel.score,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Match Vision AI labels against all allergens in the seed data.
 *
 * @param visionLabels — labels from the Vision API
 * @param allergens — full allergen seed data with vision_labels
 * @returns array of all matched allergens (may be empty)
 */
export function matchLabelsToAllergens(
  visionLabels: VisionLabel[],
  allergens: ScoutAllergenSeed[],
): ScoutMatch[] {
  const matches: ScoutMatch[] = [];

  for (const allergen of allergens) {
    const match = matchLabelsToAllergen(visionLabels, allergen);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

/* ------------------------------------------------------------------ */
/* Scan analysis                                                       */
/* ------------------------------------------------------------------ */

/**
 * Analyze a Trigger Scout scan to determine which allergens
 * get the proximity multiplier and which are dormant.
 *
 * The 2.5x multiplier ONLY applies when ALL conditions are met:
 * 1. Vision AI matched the allergen above its confidence threshold
 * 2. symptoms_present is true (global_severity > 0)
 * 3. seasonal_active is true for that allergen
 *
 * When conditions are not met, the scan is still saved but the
 * allergen gets a "dormant" badge — the multiplier is deferred.
 *
 * @param matches — allergens matched from the Vision scan
 * @param conditionsMap — per-allergen conditions (symptoms + seasonal)
 * @returns ScoutScanResult with active and dormant allergen lists
 */
export function analyzeScan(
  matches: ScoutMatch[],
  conditionsMap: Map<string, ScoutConditions>,
): ScoutScanResult {
  const active_allergen_ids: string[] = [];
  const dormant_allergen_ids: string[] = [];

  for (const match of matches) {
    const conditions = conditionsMap.get(match.allergen_id);

    if (
      conditions &&
      conditions.symptoms_present &&
      conditions.seasonal_active
    ) {
      active_allergen_ids.push(match.allergen_id);
    } else {
      dormant_allergen_ids.push(match.allergen_id);
    }
  }

  return {
    matches,
    active_allergen_ids,
    dormant_allergen_ids,
    has_active_matches: active_allergen_ids.length > 0,
  };
}
