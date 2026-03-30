/**
 * Census ACS API Client
 *
 * Fetches block-group median household income and maps it to an
 * opaque income_tier (1-5). The tier is a SILENT model weight —
 * it must NEVER be labeled as "income" in any API response or UI.
 *
 * Server-side only — API key must never be exposed to the client.
 *
 * Reference: https://api.census.gov/data/2022/acs/acs5
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CensusResult {
  /** Opaque tier 1-5. NEVER label this as "income". */
  income_tier: number;
  /** Raw median income for server-side model use only */
  median_income: number;
  /** Census FIPS codes used in the lookup */
  fips: {
    state: string;
    county: string;
    tract: string;
    block_group: string;
  };
}

/* ------------------------------------------------------------------ */
/* Income Tier Mapping                                                 */
/* ------------------------------------------------------------------ */

/**
 * Map median household income to an opaque tier (1-5).
 *
 * Tier boundaries based on 2022 ACS national distribution:
 *   1: < $35,000    (bottom quintile)
 *   2: $35,000-54,999
 *   3: $55,000-84,999 (middle)
 *   4: $85,000-124,999
 *   5: >= $125,000  (top quintile)
 *
 * IMPORTANT: This mapping is used as a model weight only.
 * The tier value must NEVER be displayed to users or labeled as "income".
 */
export function mapIncomeToTier(medianIncome: number): number {
  if (medianIncome < 35000) return 1;
  if (medianIncome < 55000) return 2;
  if (medianIncome < 85000) return 3;
  if (medianIncome < 125000) return 4;
  return 5;
}

/* ------------------------------------------------------------------ */
/* Geocoding to FIPS (via FCC API)                                     */
/* ------------------------------------------------------------------ */

/**
 * Convert lat/lng to Census FIPS codes using the FCC Census Block API.
 *
 * This is a free API that doesn't require a key.
 * Returns state, county, tract, and block FIPS codes.
 */
async function latLngToFips(
  lat: number,
  lng: number,
): Promise<{ state: string; county: string; tract: string; block: string } | null> {
  try {
    const url = new URL("https://geo.fcc.gov/api/census/block/find");
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lng.toString());
    url.searchParams.set("format", "json");
    url.searchParams.set("showall", "false");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    const fips = data?.Block?.FIPS;

    if (!fips || fips.length < 15) return null;

    // FIPS format: SSCCCTTTTTTBBBB (2+3+6+4 = 15 chars)
    return {
      state: fips.substring(0, 2),
      county: fips.substring(2, 5),
      tract: fips.substring(5, 11),
      block: fips.substring(11, 15),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Census ACS API                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fetch block-group median household income from Census ACS 5-year.
 *
 * Variable: B19013_001E (Median Household Income)
 *
 * @param lat — latitude
 * @param lng — longitude
 * @returns CensusResult with income_tier, or null if lookup fails
 */
export async function getBlockGroupIncome(
  lat: number,
  lng: number,
): Promise<CensusResult | null> {
  // Step 1: Convert lat/lng to FIPS codes
  const fips = await latLngToFips(lat, lng);
  if (!fips) return null;

  // Step 2: Query Census ACS for median household income
  const apiKey = process.env.CENSUS_API_KEY;
  // Census API works without a key (rate-limited) but key improves reliability
  const keyParam = apiKey ? `&key=${apiKey}` : "";

  // Block group = first digit of block code
  const blockGroup = fips.block.substring(0, 1);

  try {
    const url =
      `https://api.census.gov/data/2022/acs/acs5` +
      `?get=B19013_001E` +
      `&for=block%20group:${blockGroup}` +
      `&in=state:${fips.state}%20county:${fips.county}%20tract:${fips.tract}` +
      keyParam;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    // Response is [[header], [values]] — income is first data value
    if (!data || data.length < 2) return null;

    const medianIncome = parseInt(data[1][0], 10);
    if (isNaN(medianIncome) || medianIncome < 0) return null;

    return {
      income_tier: mapIncomeToTier(medianIncome),
      median_income: medianIncome,
      fips: {
        state: fips.state,
        county: fips.county,
        tract: fips.tract,
        block_group: blockGroup,
      },
    };
  } catch {
    return null;
  }
}
