/**
 * Google Pollen API Client
 *
 * Fetches species-level pollen data on a 1x1km grid tile.
 * Returns Universal Pollen Index (UPI) values (0-5 scale) for
 * tree, grass, and weed categories.
 *
 * Server-side only — API key must never be exposed to the client.
 *
 * Reference: https://developers.google.com/maps/documentation/pollen
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PollenIndex {
  /** UPI value (0-5 scale) */
  value: number;
  /** Human-readable category */
  category: string;
}

export interface PollenSpeciesInfo {
  /** Species display name */
  display_name: string;
  /** UPI index for this species */
  index: PollenIndex;
}

export interface PollenResult {
  /** Tree pollen UPI (0-5), null if unavailable */
  upi_tree: number | null;
  /** Grass pollen UPI (0-5), null if unavailable */
  upi_grass: number | null;
  /** Weed pollen UPI (0-5), null if unavailable */
  upi_weed: number | null;
  /** Individual species data when available */
  species: PollenSpeciesInfo[];
  /** Data timestamp from API */
  date: string | null;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

/** Returned when API is unreachable or key is missing */
export const POLLEN_DEFAULTS: PollenResult = {
  upi_tree: null,
  upi_grass: null,
  upi_weed: null,
  species: [],
  date: null,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Extract UPI value for a pollen type from the API response.
 * The API returns pollenTypeInfo as an array of objects with
 * code (TREE, GRASS, WEED) and indexInfo containing the UPI value.
 */
function extractUpi(
  pollenTypes: Array<{ code: string; indexInfo?: { value?: number } }> | undefined,
  code: string,
): number | null {
  if (!pollenTypes) return null;
  const entry = pollenTypes.find((p) => p.code === code);
  const value = entry?.indexInfo?.value;
  return typeof value === "number" ? value : null;
}

/**
 * Extract species-level data from the API response.
 */
function extractSpecies(
  pollenTypes: Array<{
    code: string;
    healthRecommendations?: string[];
    plantInfo?: Array<{
      displayName?: string;
      indexInfo?: { value?: number; category?: string };
    }>;
  }> | undefined,
): PollenSpeciesInfo[] {
  if (!pollenTypes) return [];

  const species: PollenSpeciesInfo[] = [];
  for (const type of pollenTypes) {
    if (!type.plantInfo) continue;
    for (const plant of type.plantInfo) {
      if (plant.displayName && plant.indexInfo?.value != null) {
        species.push({
          display_name: plant.displayName,
          index: {
            value: plant.indexInfo.value,
            category: plant.indexInfo.category ?? "unknown",
          },
        });
      }
    }
  }
  return species;
}

/* ------------------------------------------------------------------ */
/* API Client                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch pollen data for a location from the Google Pollen API.
 *
 * Returns UPI (Universal Pollen Index) values for tree, grass, and
 * weed categories on a 1x1km grid tile.
 *
 * @param lat — latitude
 * @param lng — longitude
 * @returns PollenResult with UPI values, or defaults if API fails
 */
export async function getPollenData(
  lat: number,
  lng: number,
): Promise<PollenResult> {
  const apiKey = process.env.GOOGLE_POLLEN_API_KEY;
  if (!apiKey) return POLLEN_DEFAULTS;

  try {
    const url = new URL(
      "https://pollen.googleapis.com/v1/forecast:lookup",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("location.longitude", lng.toString());
    url.searchParams.set("location.latitude", lat.toString());
    url.searchParams.set("days", "1");
    url.searchParams.set("plantsDescription", "true");

    const response = await fetch(url.toString());
    if (!response.ok) return POLLEN_DEFAULTS;

    const data = await response.json();

    // The API returns dailyInfo as an array; we want today's entry
    const today = data?.dailyInfo?.[0];
    if (!today) return POLLEN_DEFAULTS;

    const pollenTypes = today.pollenTypeInfo;

    return {
      upi_tree: extractUpi(pollenTypes, "TREE"),
      upi_grass: extractUpi(pollenTypes, "GRASS"),
      upi_weed: extractUpi(pollenTypes, "WEED"),
      species: extractSpecies(pollenTypes),
      date: today.date
        ? `${today.date.year}-${String(today.date.month).padStart(2, "0")}-${String(today.date.day).padStart(2, "0")}`
        : null,
    };
  } catch {
    return POLLEN_DEFAULTS;
  }
}
