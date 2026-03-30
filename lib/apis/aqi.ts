/**
 * WAQI (World Air Quality Index) API Client
 *
 * Fetches real-time air quality data including AQI, PM2.5, and PM10.
 * Used by the tournament engine as an environmental factor in
 * allergen exposure modeling.
 *
 * Server-side only — API token must never be exposed to the client.
 *
 * Reference: https://aqicn.org/json-api/doc/
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AqiResult {
  /** Overall Air Quality Index (0-500+) */
  aqi: number | null;
  /** PM2.5 concentration (ug/m3) */
  pm25: number | null;
  /** PM10 concentration (ug/m3) */
  pm10: number | null;
  /** Dominant pollutant identifier */
  dominant_pollutant: string | null;
  /** Station name providing the data */
  station: string | null;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

/** Returned when API is unreachable or token is missing */
export const AQI_DEFAULTS: AqiResult = {
  aqi: null,
  pm25: null,
  pm10: null,
  dominant_pollutant: null,
  station: null,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Extract a specific pollutant value from the WAQI iaqi object.
 * WAQI returns individual pollutant readings as { v: number }.
 */
function extractIaqi(
  iaqi: Record<string, { v: number }> | undefined,
  key: string,
): number | null {
  if (!iaqi) return null;
  const entry = iaqi[key];
  return typeof entry?.v === "number" ? entry.v : null;
}

/* ------------------------------------------------------------------ */
/* API Client                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch air quality data from WAQI for a location.
 *
 * Uses the geo-based feed endpoint which returns the nearest
 * monitoring station's data for the given coordinates.
 *
 * @param lat — latitude
 * @param lng — longitude
 * @returns AqiResult with AQI and particulate data, or defaults if API fails
 */
export async function getAqiData(
  lat: number,
  lng: number,
): Promise<AqiResult> {
  const apiToken = process.env.WAQI_API_TOKEN;
  if (!apiToken) return AQI_DEFAULTS;

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${apiToken}`;

    const response = await fetch(url);
    if (!response.ok) return AQI_DEFAULTS;

    const data = await response.json();

    if (data.status !== "ok" || !data.data) return AQI_DEFAULTS;

    const feed = data.data;

    return {
      aqi: typeof feed.aqi === "number" ? feed.aqi : null,
      pm25: extractIaqi(feed.iaqi, "pm25"),
      pm10: extractIaqi(feed.iaqi, "pm10"),
      dominant_pollutant:
        typeof feed.dominentpol === "string" ? feed.dominentpol : null,
      station:
        typeof feed.city?.name === "string" ? feed.city.name : null,
    };
  } catch {
    return AQI_DEFAULTS;
  }
}
