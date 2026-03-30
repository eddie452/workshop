/**
 * Seasonal Calendar Gate + Multipliers
 *
 * Looks up the seasonal severity for each allergen by region and month,
 * then maps severity to an Elo multiplier.
 *
 * Server-side only — never import from client components.
 *
 * Multiplier mapping:
 *   inactive → 0.0 (allergen completely suppressed this month)
 *   mild     → 1.2
 *   moderate → 2.0
 *   severe   → 3.0
 */

import type { Region } from "@/lib/supabase/types";
import type { SeasonalMultiplierResult, Severity } from "./types";
import { SEASONAL_MULTIPLIER } from "./types";
import calendarData from "@/lib/data/seasonal-calendar.json";

/* ------------------------------------------------------------------ */
/* Types for raw calendar JSON                                         */
/* ------------------------------------------------------------------ */

interface RawCalendarEntry {
  allergen_id: string;
  allergen_name: string;
  region: string;
  month: number;
  severity: string;
  activity_level: number;
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/**
 * Get the seasonal multiplier for a single allergen in a given region/month.
 *
 * Returns 0.0 for inactive (completely suppresses the allergen) or
 * if no calendar entry exists for the combination.
 *
 * @param allergenId — allergen identifier
 * @param region     — user's region
 * @param month      — 1-12
 * @returns multiplier (0.0, 1.2, 2.0, or 3.0)
 */
export function getSeasonalMultiplier(
  allergenId: string,
  region: Region,
  month: number,
): number {
  const entry = (calendarData as RawCalendarEntry[]).find(
    (e) =>
      e.allergen_id === allergenId &&
      e.region === region &&
      e.month === month,
  );

  if (!entry) return 0.0;

  const severity = entry.severity as Severity;
  return SEASONAL_MULTIPLIER[severity] ?? 0.0;
}

/**
 * Get the seasonal severity for a single allergen in a given region/month.
 *
 * @param allergenId — allergen identifier
 * @param region     — user's region
 * @param month      — 1-12
 * @returns severity string or "inactive" if not found
 */
export function getSeasonalSeverity(
  allergenId: string,
  region: Region,
  month: number,
): Severity {
  const entry = (calendarData as RawCalendarEntry[]).find(
    (e) =>
      e.allergen_id === allergenId &&
      e.region === region &&
      e.month === month,
  );

  if (!entry) return "inactive";
  return entry.severity as Severity;
}

/**
 * Get seasonal multipliers for all allergens in a region/month.
 *
 * @param allergenIds — list of allergen IDs to look up
 * @param region      — user's region
 * @param month       — 1-12
 * @returns array of { allergen_id, severity, multiplier }
 */
export function getAllSeasonalMultipliers(
  allergenIds: string[],
  region: Region,
  month: number,
): SeasonalMultiplierResult[] {
  return allergenIds.map((allergenId) => {
    const severity = getSeasonalSeverity(allergenId, region, month);
    return {
      allergen_id: allergenId,
      severity,
      multiplier: SEASONAL_MULTIPLIER[severity] ?? 0.0,
    };
  });
}

/**
 * Check if an allergen is active (not suppressed) in a given region/month.
 *
 * @param allergenId — allergen identifier
 * @param region     — user's region
 * @param month      — 1-12
 * @returns true if severity !== "inactive"
 */
export function isAllergenActive(
  allergenId: string,
  region: Region,
  month: number,
): boolean {
  return getSeasonalMultiplier(allergenId, region, month) > 0;
}
