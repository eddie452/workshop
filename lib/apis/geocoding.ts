/**
 * Google Maps Geocoding API Client
 *
 * Converts a street address to lat/lng coordinates.
 * Server-side only — API key must never be exposed to the client.
 *
 * Reference: https://developers.google.com/maps/documentation/geocoding
 */

import { fetchWithTimeout } from "./fetch-with-timeout";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface GeocodingResult {
  lat: number;
  lng: number;
  formatted_address: string;
  state: string | null;
  zip: string | null;
  /** True if coordinates fall within Continental US bounds */
  is_continental_us: boolean;
}

/* ------------------------------------------------------------------ */
/* Continental US bounds                                                */
/* ------------------------------------------------------------------ */

const CONTINENTAL_US = {
  lat_min: 24.396,  // Southern tip of Florida
  lat_max: 49.384,  // Northern border
  lng_min: -125.0,  // Western border
  lng_max: -66.93,  // Eastern border
};

/**
 * Check if coordinates fall within Continental US bounds.
 */
export function isWithinContinentalUS(lat: number, lng: number): boolean {
  return (
    lat >= CONTINENTAL_US.lat_min &&
    lat <= CONTINENTAL_US.lat_max &&
    lng >= CONTINENTAL_US.lng_min &&
    lng <= CONTINENTAL_US.lng_max
  );
}

/* ------------------------------------------------------------------ */
/* API Client                                                          */
/* ------------------------------------------------------------------ */

/**
 * Geocode an address using Google Maps Geocoding API.
 *
 * @param address — full street address
 * @returns GeocodingResult with lat/lng and metadata
 * @throws Error if API key is missing or API returns an error
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY environment variable is not set");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  // Bias toward US results
  url.searchParams.set("components", "country:US");

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString());
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Geocoding API timeout");
    }
    throw new Error(
      `Geocoding API error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!response.ok) {
    throw new Error(`Geocoding API HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(
      `Geocoding failed: ${data.status} — ${data.error_message || "No results found"}`,
    );
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;

  // Extract state and zip from address components
  const stateComponent = result.address_components?.find(
    (c: { types: string[] }) =>
      c.types.includes("administrative_area_level_1"),
  );
  const zipComponent = result.address_components?.find(
    (c: { types: string[] }) => c.types.includes("postal_code"),
  );

  return {
    lat,
    lng,
    formatted_address: result.formatted_address,
    state: stateComponent?.short_name ?? null,
    zip: zipComponent?.short_name ?? null,
    is_continental_us: isWithinContinentalUS(lat, lng),
  };
}
