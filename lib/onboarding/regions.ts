/**
 * State → Region Mapping
 *
 * Maps US state abbreviations to the 6 allergen regions used by the
 * seasonal calendar and tournament engine.
 *
 * Regions: Northeast, Midwest, Northwest, South Central, Southeast, Southwest
 */

import type { Region } from "@/lib/supabase/types";

const STATE_REGION_MAP: Record<string, Region> = {
  // Northeast
  CT: "Northeast",
  DE: "Northeast",
  MA: "Northeast",
  MD: "Northeast",
  ME: "Northeast",
  NH: "Northeast",
  NJ: "Northeast",
  NY: "Northeast",
  PA: "Northeast",
  RI: "Northeast",
  VT: "Northeast",
  DC: "Northeast",

  // Midwest
  IA: "Midwest",
  IL: "Midwest",
  IN: "Midwest",
  KS: "Midwest",
  MI: "Midwest",
  MN: "Midwest",
  MO: "Midwest",
  ND: "Midwest",
  NE: "Midwest",
  OH: "Midwest",
  SD: "Midwest",
  WI: "Midwest",

  // Northwest
  ID: "Northwest",
  MT: "Northwest",
  OR: "Northwest",
  WA: "Northwest",
  WY: "Northwest",

  // South Central
  AR: "South Central",
  LA: "South Central",
  OK: "South Central",
  TX: "South Central",

  // Southeast
  AL: "Southeast",
  FL: "Southeast",
  GA: "Southeast",
  KY: "Southeast",
  MS: "Southeast",
  NC: "Southeast",
  SC: "Southeast",
  TN: "Southeast",
  VA: "Southeast",
  WV: "Southeast",

  // Southwest
  AZ: "Southwest",
  CA: "Southwest",
  CO: "Southwest",
  HI: "Southwest",
  NM: "Southwest",
  NV: "Southwest",
  UT: "Southwest",
  AK: "Northwest",
};

/**
 * Derive the allergen region from a US state abbreviation.
 *
 * @param stateAbbr — two-letter US state abbreviation (e.g. "TX", "NY")
 * @returns Region, or null if state is not recognized
 */
export function getRegionFromState(stateAbbr: string | null): Region | null {
  if (!stateAbbr) return null;
  return STATE_REGION_MAP[stateAbbr.toUpperCase().trim()] ?? null;
}
