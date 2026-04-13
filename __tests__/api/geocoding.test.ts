import { describe, it, expect, vi, beforeEach } from "vitest";
import { geocodeAddress, isWithinContinentalUS } from "@/lib/apis/geocoding";

/* ------------------------------------------------------------------ */
/* isWithinContinentalUS                                               */
/* ------------------------------------------------------------------ */

describe("isWithinContinentalUS", () => {
  it("returns true for Nashville, TN", () => {
    expect(isWithinContinentalUS(36.1627, -86.7816)).toBe(true);
  });

  it("returns true for New York, NY", () => {
    expect(isWithinContinentalUS(40.7128, -74.006)).toBe(true);
  });

  it("returns true for Los Angeles, CA", () => {
    expect(isWithinContinentalUS(34.0522, -118.2437)).toBe(true);
  });

  it("returns false for Honolulu, HI", () => {
    expect(isWithinContinentalUS(21.3069, -157.8583)).toBe(false);
  });

  it("returns false for Anchorage, AK", () => {
    expect(isWithinContinentalUS(61.2181, -149.9003)).toBe(false);
  });

  it("returns false for coordinates outside the US", () => {
    // London
    expect(isWithinContinentalUS(51.5074, -0.1278)).toBe(false);
    // Tokyo
    expect(isWithinContinentalUS(35.6762, 139.6503)).toBe(false);
  });

  it("returns true for border coordinates", () => {
    // Southern tip of Texas
    expect(isWithinContinentalUS(25.8371, -97.4014)).toBe(true);
    // Northern Maine
    expect(isWithinContinentalUS(47.4597, -68.3289)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* geocodeAddress                                                      */
/* ------------------------------------------------------------------ */

describe("geocodeAddress", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when GOOGLE_MAPS_API_KEY is not set", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    await expect(geocodeAddress("123 Main St")).rejects.toThrow(
      "GOOGLE_MAPS_API_KEY environment variable is not set",
    );
  });

  it("returns lat/lng and metadata for a valid response", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");

    const mockResponse = {
      status: "OK",
      results: [
        {
          geometry: { location: { lat: 36.1627, lng: -86.7816 } },
          formatted_address: "123 Main St, Nashville, TN 37203, USA",
          address_components: [
            {
              short_name: "TN",
              types: ["administrative_area_level_1"],
            },
            {
              short_name: "37203",
              types: ["postal_code"],
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await geocodeAddress("123 Main St, Nashville, TN");
    expect(result.lat).toBe(36.1627);
    expect(result.lng).toBe(-86.7816);
    expect(result.state).toBe("TN");
    expect(result.zip).toBe("37203");
    expect(result.is_continental_us).toBe(true);
    expect(result.formatted_address).toContain("Nashville");
  });

  it("throws on API error status", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");

    const mockResponse = {
      status: "ZERO_RESULTS",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    await expect(
      geocodeAddress("xyznotanaddress123"),
    ).rejects.toThrow("Geocoding failed: ZERO_RESULTS");
  });

  it("throws on HTTP error", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    await expect(geocodeAddress("123 Main St")).rejects.toThrow(
      "Geocoding API HTTP error: 500",
    );
  });

  it("throws timeout error for AbortError", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");

    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

    await expect(geocodeAddress("123 Main St")).rejects.toThrow(
      "Geocoding API timeout",
    );
  });

  it("throws descriptive error for non-timeout failures", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch"),
    );

    await expect(geocodeAddress("123 Main St")).rejects.toThrow(
      "Geocoding API error: Failed to fetch",
    );
  });

  it("flags non-continental US coordinates", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");

    const mockResponse = {
      status: "OK",
      results: [
        {
          geometry: { location: { lat: 21.3069, lng: -157.8583 } },
          formatted_address: "100 Bishop St, Honolulu, HI 96813, USA",
          address_components: [
            {
              short_name: "HI",
              types: ["administrative_area_level_1"],
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await geocodeAddress("100 Bishop St, Honolulu, HI");
    expect(result.is_continental_us).toBe(false);
  });
});
