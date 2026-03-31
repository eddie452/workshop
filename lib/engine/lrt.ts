/**
 * Long-Range Transport (LRT) Detection
 *
 * Detects whether an allergen could be arriving via long-range
 * atmospheric transport based on wind direction and source regions.
 * LRT-capable allergens (e.g., birch, cedar) can travel hundreds
 * of miles on prevailing winds.
 *
 * Server-side only — never import from client components.
 *
 * Wind direction convention: meteorological (degrees, 0=N, 90=E, 180=S, 270=W).
 * Wind "from" 180 means wind blows from the south.
 */

import type { Region } from "@/lib/supabase/types";
import type { LRTAllergenInput, LRTResult } from "./types";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * LRT multiplier when transport is detected.
 * Boosts allergen score to reflect distant-source arrival.
 */
const LRT_BOOST_MULTIPLIER = 1.5;

/** No LRT effect — neutral multiplier */
const LRT_NEUTRAL_MULTIPLIER = 1.0;

/**
 * Wind direction tolerance in degrees.
 * A wind within +/- this angle of the source bearing counts as "from" that region.
 */
const WIND_DIRECTION_TOLERANCE = 45;

/**
 * Map of regions to their approximate bearing (degrees) relative to
 * a central US reference point. When wind blows FROM a region's bearing,
 * allergens from that region can arrive via LRT.
 */
const REGION_BEARING: Record<string, number> = {
  Northeast: 45,
  Midwest: 0,
  Northwest: 315,
  "South Central": 180,
  Southeast: 135,
  Southwest: 225,
};

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

/**
 * Check if wind direction indicates transport from a source region.
 *
 * @param windDeg — wind direction in degrees (meteorological: direction wind blows FROM)
 * @param sourceRegion — name of the source region
 * @returns true if wind is from the source region's direction
 */
export function isWindFromRegion(
  windDeg: number,
  sourceRegion: string,
): boolean {
  const bearing = REGION_BEARING[sourceRegion];
  if (bearing === undefined) return false;

  // Normalize to 0-360
  const normalizedWind = ((windDeg % 360) + 360) % 360;

  // Angular difference (smallest arc)
  let diff = Math.abs(normalizedWind - bearing);
  if (diff > 180) diff = 360 - diff;

  return diff <= WIND_DIRECTION_TOLERANCE;
}

/**
 * Detect LRT for a single allergen.
 *
 * An allergen receives an LRT boost when:
 * 1. It is LRT-capable
 * 2. Wind direction aligns with at least one source region
 * 3. The user's region is NOT one of the source regions (LRT = distant transport)
 *
 * @param allergen — allergen LRT data
 * @param userRegion — user's home region
 * @param windDirectionDeg — current wind direction (null = no wind data)
 * @returns LRTResult with detection status and multiplier
 */
export function detectLRT(
  allergen: LRTAllergenInput,
  userRegion: Region,
  windDirectionDeg: number | null,
): LRTResult {
  // Not LRT-capable → no boost
  if (!allergen.lrt_capable) {
    return {
      allergen_id: allergen.allergen_id,
      lrt_detected: false,
      multiplier: LRT_NEUTRAL_MULTIPLIER,
    };
  }

  // No wind data → can't detect LRT
  if (windDirectionDeg === null) {
    return {
      allergen_id: allergen.allergen_id,
      lrt_detected: false,
      multiplier: LRT_NEUTRAL_MULTIPLIER,
    };
  }

  // Filter source regions to exclude user's own region
  // (LRT is about distant transport, not local pollen)
  const distantSources = allergen.lrt_source_regions.filter(
    (r) => r !== userRegion,
  );

  // Check if wind is from any distant source region
  const lrtDetected = distantSources.some((region) =>
    isWindFromRegion(windDirectionDeg, region),
  );

  return {
    allergen_id: allergen.allergen_id,
    lrt_detected: lrtDetected,
    multiplier: lrtDetected ? LRT_BOOST_MULTIPLIER : LRT_NEUTRAL_MULTIPLIER,
  };
}

/**
 * Detect LRT for all allergens.
 *
 * @param allergens — array of allergen LRT data
 * @param userRegion — user's home region
 * @param windDirectionDeg — current wind direction (null = no wind data)
 * @returns array of LRTResult, one per allergen
 */
export function detectLRTForAll(
  allergens: LRTAllergenInput[],
  userRegion: Region,
  windDirectionDeg: number | null,
): LRTResult[] {
  return allergens.map((allergen) =>
    detectLRT(allergen, userRegion, windDirectionDeg),
  );
}
