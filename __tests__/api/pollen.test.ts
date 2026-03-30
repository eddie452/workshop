/**
 * Google Pollen API Client Tests
 *
 * Validates pollen data fetching, UPI extraction, species parsing,
 * and graceful fallback on API errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getPollenData, POLLEN_DEFAULTS } from "@/lib/apis/pollen";

/* ------------------------------------------------------------------ */
/* Mock fetch                                                          */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_POLLEN_RESPONSE = {
  dailyInfo: [
    {
      date: { year: 2026, month: 3, day: 30 },
      pollenTypeInfo: [
        {
          code: "TREE",
          indexInfo: { value: 4, category: "Very High" },
          plantInfo: [
            {
              displayName: "Oak",
              indexInfo: { value: 4, category: "Very High" },
            },
            {
              displayName: "Cedar",
              indexInfo: { value: 3, category: "High" },
            },
          ],
        },
        {
          code: "GRASS",
          indexInfo: { value: 2, category: "Moderate" },
          plantInfo: [
            {
              displayName: "Bermuda",
              indexInfo: { value: 2, category: "Moderate" },
            },
          ],
        },
        {
          code: "WEED",
          indexInfo: { value: 1, category: "Low" },
          plantInfo: [],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("getPollenData", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GOOGLE_POLLEN_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("successful API response", () => {
    it("returns UPI values for tree, grass, and weed", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_POLLEN_RESPONSE),
      });

      const result = await getPollenData(36.1627, -86.7816);

      expect(result.upi_tree).toBe(4);
      expect(result.upi_grass).toBe(2);
      expect(result.upi_weed).toBe(1);
    });

    it("extracts species data from plantInfo", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_POLLEN_RESPONSE),
      });

      const result = await getPollenData(36.1627, -86.7816);

      expect(result.species).toHaveLength(3);
      expect(result.species[0]).toEqual({
        display_name: "Oak",
        index: { value: 4, category: "Very High" },
      });
      expect(result.species[1]).toEqual({
        display_name: "Cedar",
        index: { value: 3, category: "High" },
      });
      expect(result.species[2]).toEqual({
        display_name: "Bermuda",
        index: { value: 2, category: "Moderate" },
      });
    });

    it("formats date as YYYY-MM-DD", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_POLLEN_RESPONSE),
      });

      const result = await getPollenData(36.1627, -86.7816);
      expect(result.date).toBe("2026-03-30");
    });

    it("passes correct parameters to the API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_POLLEN_RESPONSE),
      });

      await getPollenData(36.1627, -86.7816);

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        "https://pollen.googleapis.com/v1/forecast:lookup",
      );
      expect(calledUrl.searchParams.get("key")).toBe("test-key");
      expect(calledUrl.searchParams.get("location.latitude")).toBe("36.1627");
      expect(calledUrl.searchParams.get("location.longitude")).toBe("-86.7816");
      expect(calledUrl.searchParams.get("days")).toBe("1");
    });
  });

  describe("missing data handling", () => {
    it("returns null UPI when pollen type is missing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            dailyInfo: [
              {
                date: { year: 2026, month: 3, day: 30 },
                pollenTypeInfo: [
                  { code: "TREE", indexInfo: { value: 3 } },
                  // GRASS and WEED missing
                ],
              },
            ],
          }),
      });

      const result = await getPollenData(36.1627, -86.7816);
      expect(result.upi_tree).toBe(3);
      expect(result.upi_grass).toBeNull();
      expect(result.upi_weed).toBeNull();
    });

    it("returns defaults for empty dailyInfo", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dailyInfo: [] }),
      });

      const result = await getPollenData(36.1627, -86.7816);
      expect(result).toEqual(POLLEN_DEFAULTS);
    });
  });

  describe("error handling", () => {
    it("returns defaults when API key is missing", async () => {
      delete process.env.GOOGLE_POLLEN_API_KEY;

      const result = await getPollenData(36.1627, -86.7816);
      expect(result).toEqual(POLLEN_DEFAULTS);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns defaults when API returns non-OK status", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 403 });

      const result = await getPollenData(36.1627, -86.7816);
      expect(result).toEqual(POLLEN_DEFAULTS);
    });

    it("returns defaults when fetch throws network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const result = await getPollenData(36.1627, -86.7816);
      expect(result).toEqual(POLLEN_DEFAULTS);
    });

    it("returns defaults when response JSON is malformed", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await getPollenData(36.1627, -86.7816);
      expect(result).toEqual(POLLEN_DEFAULTS);
    });
  });
});
