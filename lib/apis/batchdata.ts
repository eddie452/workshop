/**
 * BatchData Property API Client
 *
 * Fetches property data (year_built, home_type, sqft) for an address.
 * Falls back to local JSON fixtures when the API is unavailable.
 * Falls back to null (manual entry) when neither source has data.
 *
 * Server-side only — API key must never be exposed to the client.
 *
 * Reference: https://developer.batchdata.com/docs/batchdata/property-details
 */

import fixtureData from "@/lib/data/batchdata-fixtures.json";
import { fetchWithTimeout } from "./fetch-with-timeout";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PropertyData {
  year_built: number | null;
  home_type: string | null;
  sqft: number | null;
  /** Where the data came from */
  source: "api" | "fixture" | "manual";
}

interface FixtureEntry {
  address: string;
  year_built: number | null;
  home_type: string | null;
  sqft: number | null;
}

/* ------------------------------------------------------------------ */
/* Fixture Lookup                                                      */
/* ------------------------------------------------------------------ */

/**
 * Look up property data in the local fixtures file.
 *
 * Normalizes both the query and fixture addresses to lowercase
 * for case-insensitive matching.
 *
 * @param address — address to look up
 * @returns PropertyData if found, null if not
 */
export function lookupFixture(address: string): PropertyData | null {
  const normalized = address.toLowerCase().trim();

  const match = (fixtureData as FixtureEntry[]).find(
    (entry) => entry.address.toLowerCase().trim() === normalized,
  );

  if (!match) return null;

  return {
    year_built: match.year_built,
    home_type: match.home_type,
    sqft: match.sqft,
    source: "fixture",
  };
}

/* ------------------------------------------------------------------ */
/* API Client                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch property data from BatchData API.
 *
 * @param address — full street address
 * @returns PropertyData from API, or null if API fails
 */
async function fetchFromApi(address: string): Promise<PropertyData | null> {
  const apiKey = process.env.BATCHDATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(
      "https://api.batchdata.com/api/v1/property/lookup/address",
    );
    url.searchParams.set("address", address);

    const response = await fetchWithTimeout(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const property = data?.results?.properties?.[0];

    if (!property) return null;

    return {
      year_built: property.yearBuilt ?? property.year_built ?? null,
      home_type: normalizeHomeType(
        property.propertyType ?? property.property_type,
      ),
      sqft: property.livingArea ?? property.living_area ?? null,
      source: "api",
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Home Type Normalization                                             */
/* ------------------------------------------------------------------ */

/**
 * Normalize BatchData property type strings to our HomeType enum.
 */
function normalizeHomeType(rawType: string | null | undefined): string | null {
  if (!rawType) return null;

  const lower = rawType.toLowerCase();
  if (lower.includes("single") || lower.includes("sfr"))
    return "single_family";
  if (lower.includes("condo")) return "condo";
  if (lower.includes("townhouse") || lower.includes("town house"))
    return "townhouse";
  if (lower.includes("mobile") || lower.includes("manufactured"))
    return "mobile";
  if (lower.includes("apartment") || lower.includes("multi")) {
    // Rough heuristic — multi-family could be low or high rise
    return "apartment_low_rise";
  }
  return "other";
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Get property data for an address.
 *
 * Attempts in order:
 * 1. BatchData API (if BATCHDATA_API_KEY is set)
 * 2. Local fixtures (for known test addresses)
 * 3. Returns null (user enters data manually)
 *
 * @param address — full street address
 * @returns PropertyData or null for manual entry fallback
 */
export async function getPropertyData(
  address: string,
): Promise<PropertyData | null> {
  // 1. Try live API
  const apiResult = await fetchFromApi(address);
  if (apiResult) return apiResult;

  // 2. Try fixture fallback
  const fixtureResult = lookupFixture(address);
  if (fixtureResult) return fixtureResult;

  // 3. Manual entry fallback
  return null;
}
