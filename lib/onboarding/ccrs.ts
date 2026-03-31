/**
 * CCRS (Cockroach Climate Risk Score) Derivation for Onboarding
 *
 * Computes an initial CCRS (0-100) from the user's home profile.
 * Used to seed the cockroach allergen gate in the tournament engine.
 *
 * Factors:
 * - State/region climate (warm, humid = higher risk)
 * - Home age (older = higher risk)
 * - Home type (apartments > single family)
 * - Cockroach sighting (direct signal)
 */

import type { Region, HomeType } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Region base scores                                                   */
/* ------------------------------------------------------------------ */

const REGION_COCKROACH_BASE: Record<Region, number> = {
  Southeast: 35,
  "South Central": 35,
  Southwest: 25,
  Northeast: 20,
  Midwest: 15,
  Northwest: 10,
};

/* ------------------------------------------------------------------ */
/* Home age modifier                                                    */
/* ------------------------------------------------------------------ */

function homeAgeScore(yearBuilt: number | null): number {
  if (!yearBuilt) return 10; // unknown = moderate default
  const age = new Date().getFullYear() - yearBuilt;
  if (age > 60) return 20;
  if (age > 40) return 15;
  if (age > 20) return 10;
  return 5;
}

/* ------------------------------------------------------------------ */
/* Home type modifier                                                   */
/* ------------------------------------------------------------------ */

const HOME_TYPE_SCORE: Record<HomeType, number> = {
  apartment_high_rise: 20,
  apartment_low_rise: 18,
  townhouse: 12,
  single_family: 8,
  condo: 10,
  mobile: 15,
  other: 10,
};

function homeTypeScore(homeType: HomeType | string | null): number {
  if (!homeType) return 10;
  return HOME_TYPE_SCORE[homeType as HomeType] ?? 10;
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export interface CCRSInputData {
  region: Region | null;
  yearBuilt: number | null;
  homeType: HomeType | string | null;
  cockroachSighting: boolean;
}

/**
 * Derive CCRS score (0-100) from home profile data.
 *
 * @param data — home profile inputs
 * @returns CCRS score clamped to 0-100
 */
export function deriveCCRS(data: CCRSInputData): number {
  const regionBase = data.region
    ? REGION_COCKROACH_BASE[data.region]
    : 15;
  const ageScore = homeAgeScore(data.yearBuilt);
  const typeScore = homeTypeScore(data.homeType);
  const sightingBonus = data.cockroachSighting ? 25 : 0;

  const raw = regionBase + ageScore + typeScore + sightingBonus;
  return Math.min(100, Math.max(0, raw));
}
