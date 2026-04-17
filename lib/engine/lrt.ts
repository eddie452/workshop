/**
 * Long-Range Transport (LRT) Detection
 *
 * Detects whether an allergen could be arriving via long-range
 * atmospheric transport based on:
 *   1. Source region currently in bloom (seasonal calendar)
 *   2. Wind trajectory confirms transport toward user
 *   3. Distance within lrt_max_miles (with decay for farther sources)
 *
 * This is a simplified surrogate for NOAA HYSPLIT trajectory modeling —
 * no external API call. Wind direction + inter-region distance is
 * sufficient for workshop-grade LRT detection.
 *
 * Server-side only — never import from client components.
 *
 * Wind direction convention: meteorological (degrees, 0=N, 90=E, 180=S, 270=W).
 * Wind "from" 180 means wind blows from the south.
 *
 * LRT species (from seed data):
 *   - cedar/juniper: 1000+ mi
 *   - ragweed:       400 mi
 *   - pine:          300 mi
 *   - bermuda:       100 mi
 *   - olive:         100 mi
 */

import type { Region } from "@/lib/supabase/types";
import type { LRTAllergenInput, LRTResult } from "./types";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * Maximum LRT multiplier when transport is detected at zero distance
 * from the source. Multiplier decays linearly to `LRT_MIN_BOOST` as
 * distance approaches `lrt_max_miles`.
 */
const LRT_BOOST_MULTIPLIER = 1.5;

/**
 * Minimum boost applied when LRT is detected but the source is at the
 * edge of its transport range. Keeps LRT distinguishable from
 * no-LRT (1.0) even at max distance.
 */
const LRT_MIN_BOOST = 1.1;

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

/**
 * Approximate centroid distances between US regions (miles).
 * Used for distance-decay when a source region is distant.
 * Symmetric: distance(A, B) === distance(B, A). Diagonal is 0.
 *
 * Values are rough great-circle estimates between region centroids,
 * adequate for the simplified LRT model. Same-region sources resolve
 * to zero distance and are filtered out upstream (LRT is about
 * _distant_ transport).
 */
const REGION_DISTANCE_MI: Record<string, Record<string, number>> = {
  Northeast: {
    Northeast: 0,
    Midwest: 700,
    Northwest: 2200,
    "South Central": 1400,
    Southeast: 900,
    Southwest: 1900,
  },
  Midwest: {
    Northeast: 700,
    Midwest: 0,
    Northwest: 1500,
    "South Central": 700,
    Southeast: 800,
    Southwest: 1200,
  },
  Northwest: {
    Northeast: 2200,
    Midwest: 1500,
    Northwest: 0,
    "South Central": 1700,
    Southeast: 2300,
    Southwest: 900,
  },
  "South Central": {
    Northeast: 1400,
    Midwest: 700,
    Northwest: 1700,
    "South Central": 0,
    Southeast: 700,
    Southwest: 900,
  },
  Southeast: {
    Northeast: 900,
    Midwest: 800,
    Northwest: 2300,
    "South Central": 700,
    Southeast: 0,
    Southwest: 1800,
  },
  Southwest: {
    Northeast: 1900,
    Midwest: 1200,
    Northwest: 900,
    "South Central": 900,
    Southeast: 1800,
    Southwest: 0,
  },
};

/* ------------------------------------------------------------------ */
/* Distance                                                            */
/* ------------------------------------------------------------------ */

/**
 * Approximate distance in miles between two US regions.
 *
 * @param from — source region
 * @param to   — destination region (user location)
 * @returns distance in miles, or `null` if either region is unknown
 */
export function regionDistanceMiles(
  from: string,
  to: string,
): number | null {
  const row = REGION_DISTANCE_MI[from];
  if (!row) return null;
  const d = row[to];
  return d === undefined ? null : d;
}

/**
 * Compute a linear distance-decay factor in [LRT_MIN_BOOST, LRT_BOOST_MULTIPLIER].
 *
 *   distance 0            → LRT_BOOST_MULTIPLIER (full boost)
 *   distance lrt_max_miles → LRT_MIN_BOOST       (edge of range)
 *   distance > lrt_max_miles → 1.0               (out of range, no boost)
 *
 * @param distanceMi — distance from source to user (miles)
 * @param maxMi      — lrt_max_miles for this allergen
 * @returns multiplier to apply
 */
export function distanceDecayMultiplier(
  distanceMi: number,
  maxMi: number,
): number {
  if (maxMi <= 0) return LRT_NEUTRAL_MULTIPLIER;
  if (distanceMi < 0) return LRT_BOOST_MULTIPLIER;
  if (distanceMi > maxMi) return LRT_NEUTRAL_MULTIPLIER;

  const ratio = distanceMi / maxMi; // 0..1
  // Linear interpolation from LRT_BOOST_MULTIPLIER down to LRT_MIN_BOOST
  return (
    LRT_BOOST_MULTIPLIER -
    ratio * (LRT_BOOST_MULTIPLIER - LRT_MIN_BOOST)
  );
}

/* ------------------------------------------------------------------ */
/* Wind                                                                */
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

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

/**
 * Predicate for checking whether a source region is currently in bloom
 * for a given allergen. Injected as a callback so `lrt.ts` doesn't pull
 * in the seasonal calendar directly (keeps this module a leaf).
 *
 * Callers in the run orchestrator should pass a closure that consults
 * `getSeasonalSeverity(...)` from `./seasonal`.
 */
export type BloomPredicate = (
  allergenId: string,
  sourceRegion: Region,
) => boolean;

/**
 * Options for {@link detectLRT}.
 *
 * All fields are optional; omitting them preserves legacy behavior
 * (wind-only LRT with a flat 1.5 multiplier).
 */
export interface DetectLRTOptions {
  /**
   * Predicate returning `true` when `sourceRegion` is currently in bloom
   * for `allergenId`. When provided, LRT is only detected for sources
   * confirmed to be in bloom.
   */
  isSourceInBloom?: BloomPredicate;
  /**
   * When `true`, apply linear distance decay between full boost
   * ({@link LRT_BOOST_MULTIPLIER}) at zero distance and {@link LRT_MIN_BOOST}
   * at `lrt_max_miles`. Sources beyond `lrt_max_miles` are treated as
   * out-of-range and produce no boost.
   *
   * When `false` (default), all in-range detections produce the flat
   * {@link LRT_BOOST_MULTIPLIER}.
   */
  applyDistanceDecay?: boolean;
}

/**
 * Detect LRT for a single allergen.
 *
 * An allergen receives an LRT boost when ALL of:
 * 1. It is LRT-capable
 * 2. Wind data is available
 * 3. At least one distant source region passes every requested check:
 *    - Wind direction aligns with that region's bearing
 *    - (optional) Source region is currently in bloom
 *    - (optional) Source region is within `lrt_max_miles`
 *
 * The user's own region is excluded from source consideration — LRT
 * describes _distant_ transport, not local pollen.
 *
 * @param allergen — allergen LRT data
 * @param userRegion — user's home region
 * @param windDirectionDeg — current wind direction (null = no wind data)
 * @param options — optional bloom predicate and distance-decay flag
 * @returns LRTResult with detection status and multiplier
 */
export function detectLRT(
  allergen: LRTAllergenInput,
  userRegion: Region,
  windDirectionDeg: number | null,
  options: DetectLRTOptions = {},
): LRTResult {
  const neutral: LRTResult = {
    allergen_id: allergen.allergen_id,
    lrt_detected: false,
    multiplier: LRT_NEUTRAL_MULTIPLIER,
  };

  // Not LRT-capable → no boost
  if (!allergen.lrt_capable) return neutral;

  // No wind data → can't detect LRT
  if (windDirectionDeg === null) return neutral;

  // Filter source regions to exclude user's own region
  // (LRT is about distant transport, not local pollen)
  const distantSources = allergen.lrt_source_regions.filter(
    (r) => r !== userRegion,
  );

  let bestMultiplier = LRT_NEUTRAL_MULTIPLIER;

  for (const source of distantSources) {
    // 1. Wind alignment
    if (!isWindFromRegion(windDirectionDeg, source)) continue;

    // 2. Bloom check (optional)
    if (options.isSourceInBloom) {
      if (!options.isSourceInBloom(allergen.allergen_id, source as Region)) {
        continue;
      }
    }

    // 3. Distance check (when decay is requested)
    let multiplier = LRT_BOOST_MULTIPLIER;
    if (options.applyDistanceDecay && allergen.lrt_max_miles !== null) {
      const distance = regionDistanceMiles(source, userRegion);
      if (distance === null) continue;
      if (distance > allergen.lrt_max_miles) continue; // out of range
      multiplier = distanceDecayMultiplier(distance, allergen.lrt_max_miles);
    }

    if (multiplier > bestMultiplier) bestMultiplier = multiplier;
  }

  const detected = bestMultiplier > LRT_NEUTRAL_MULTIPLIER;
  return {
    allergen_id: allergen.allergen_id,
    lrt_detected: detected,
    multiplier: detected ? bestMultiplier : LRT_NEUTRAL_MULTIPLIER,
  };
}

/**
 * Detect LRT for all allergens.
 *
 * @param allergens — array of allergen LRT data
 * @param userRegion — user's home region
 * @param windDirectionDeg — current wind direction (null = no wind data)
 * @param options — optional bloom predicate and distance-decay flag
 * @returns array of LRTResult, one per allergen
 */
export function detectLRTForAll(
  allergens: LRTAllergenInput[],
  userRegion: Region,
  windDirectionDeg: number | null,
  options: DetectLRTOptions = {},
): LRTResult[] {
  return allergens.map((allergen) =>
    detectLRT(allergen, userRegion, windDirectionDeg, options),
  );
}
