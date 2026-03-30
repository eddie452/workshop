/**
 * WAQI (World Air Quality Index) API Client Tests
 *
 * Validates AQI data fetching, pollutant extraction,
 * and graceful fallback on errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAqiData, AQI_DEFAULTS } from "@/lib/apis/aqi";

/* ------------------------------------------------------------------ */
/* Mock fetch                                                          */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_AQI_RESPONSE = {
  status: "ok",
  data: {
    aqi: 42,
    dominentpol: "pm25",
    iaqi: {
      pm25: { v: 12.5 },
      pm10: { v: 28.3 },
      o3: { v: 18.0 },
    },
    city: {
      name: "Nashville, Tennessee, USA",
    },
  },
};

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("getAqiData", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, WAQI_API_TOKEN: "test-token" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("successful API response", () => {
    it("returns AQI and pollutant data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_AQI_RESPONSE),
      });

      const result = await getAqiData(36.1627, -86.7816);

      expect(result.aqi).toBe(42);
      expect(result.pm25).toBe(12.5);
      expect(result.pm10).toBe(28.3);
      expect(result.dominant_pollutant).toBe("pm25");
      expect(result.station).toBe("Nashville, Tennessee, USA");
    });

    it("constructs correct URL with token and coordinates", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_AQI_RESPONSE),
      });

      await getAqiData(36.1627, -86.7816);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe(
        "https://api.waqi.info/feed/geo:36.1627;-86.7816/?token=test-token",
      );
    });

    it("returns null for missing pollutant readings", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "ok",
            data: {
              aqi: 50,
              iaqi: {}, // no pm25 or pm10
              city: { name: "Test Station" },
            },
          }),
      });

      const result = await getAqiData(36.1627, -86.7816);
      expect(result.aqi).toBe(50);
      expect(result.pm25).toBeNull();
      expect(result.pm10).toBeNull();
    });

    it("returns null dominant_pollutant when not provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "ok",
            data: {
              aqi: 30,
              iaqi: { pm25: { v: 8 } },
              city: { name: "Test" },
            },
          }),
      });

      const result = await getAqiData(36.1627, -86.7816);
      expect(result.dominant_pollutant).toBeNull();
    });
  });

  describe("error handling", () => {
    it("returns defaults when API token is missing", async () => {
      delete process.env.WAQI_API_TOKEN;

      const result = await getAqiData(36.1627, -86.7816);
      expect(result).toEqual(AQI_DEFAULTS);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns defaults when API returns non-OK HTTP status", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await getAqiData(36.1627, -86.7816);
      expect(result).toEqual(AQI_DEFAULTS);
    });

    it("returns defaults when API returns error status in body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "error",
            data: "Invalid key",
          }),
      });

      const result = await getAqiData(36.1627, -86.7816);
      expect(result).toEqual(AQI_DEFAULTS);
    });

    it("returns defaults when fetch throws network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const result = await getAqiData(36.1627, -86.7816);
      expect(result).toEqual(AQI_DEFAULTS);
    });

    it("returns defaults when response data is null", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "ok", data: null }),
      });

      const result = await getAqiData(36.1627, -86.7816);
      expect(result).toEqual(AQI_DEFAULTS);
    });
  });
});
