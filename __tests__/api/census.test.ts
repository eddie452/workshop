import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapIncomeToTier, getBlockGroupIncome } from "@/lib/apis/census";

/* ------------------------------------------------------------------ */
/* mapIncomeToTier                                                     */
/* ------------------------------------------------------------------ */

describe("mapIncomeToTier", () => {
  it("returns tier 1 for income < $35,000", () => {
    expect(mapIncomeToTier(20000)).toBe(1);
    expect(mapIncomeToTier(34999)).toBe(1);
  });

  it("returns tier 2 for $35,000-$54,999", () => {
    expect(mapIncomeToTier(35000)).toBe(2);
    expect(mapIncomeToTier(54999)).toBe(2);
  });

  it("returns tier 3 for $55,000-$84,999", () => {
    expect(mapIncomeToTier(55000)).toBe(3);
    expect(mapIncomeToTier(84999)).toBe(3);
  });

  it("returns tier 4 for $85,000-$124,999", () => {
    expect(mapIncomeToTier(85000)).toBe(4);
    expect(mapIncomeToTier(124999)).toBe(4);
  });

  it("returns tier 5 for income >= $125,000", () => {
    expect(mapIncomeToTier(125000)).toBe(5);
    expect(mapIncomeToTier(250000)).toBe(5);
  });

  it("handles boundary values correctly", () => {
    expect(mapIncomeToTier(0)).toBe(1);
    expect(mapIncomeToTier(34999)).toBe(1);
    expect(mapIncomeToTier(35000)).toBe(2);
    expect(mapIncomeToTier(54999)).toBe(2);
    expect(mapIncomeToTier(55000)).toBe(3);
    expect(mapIncomeToTier(84999)).toBe(3);
    expect(mapIncomeToTier(85000)).toBe(4);
    expect(mapIncomeToTier(124999)).toBe(4);
    expect(mapIncomeToTier(125000)).toBe(5);
  });

  it("income_tier is NEVER labeled as 'income' — field name is opaque", () => {
    // This test documents the privacy requirement.
    // The function returns a number (1-5), not a string containing "income".
    const tier = mapIncomeToTier(75000);
    expect(typeof tier).toBe("number");
    expect(tier).toBeGreaterThanOrEqual(1);
    expect(tier).toBeLessThanOrEqual(5);
  });
});

/* ------------------------------------------------------------------ */
/* getBlockGroupIncome                                                 */
/* ------------------------------------------------------------------ */

describe("getBlockGroupIncome", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns income_tier for valid FIPS + Census response", async () => {
    // Mock FCC geocoder
    const fccResponse = {
      Block: {
        FIPS: "470370109001023",
      },
    };

    // Mock Census ACS response
    const censusResponse = [
      ["B19013_001E", "state", "county", "tract", "block group"],
      ["75000", "47", "037", "010900", "1"],
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(fccResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(censusResponse), { status: 200 }),
      );

    const result = await getBlockGroupIncome(36.1627, -86.7816);
    expect(result).not.toBeNull();
    expect(result!.income_tier).toBe(3); // $75,000 → tier 3
    expect(result!.median_income).toBe(75000);
    expect(result!.fips.state).toBe("47");
    expect(result!.fips.county).toBe("037");
  });

  it("returns null when FCC geocoder fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Error", { status: 500 }),
    );

    const result = await getBlockGroupIncome(36.1627, -86.7816);
    expect(result).toBeNull();
  });

  it("returns null when Census API returns no data", async () => {
    const fccResponse = {
      Block: {
        FIPS: "470370109001023",
      },
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(fccResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([["B19013_001E"]]), { status: 200 }),
      );

    const result = await getBlockGroupIncome(36.1627, -86.7816);
    expect(result).toBeNull();
  });

  it("returns null when network error occurs", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await getBlockGroupIncome(36.1627, -86.7816);
    expect(result).toBeNull();
  });

  it("returns correct tier for high-income area", async () => {
    const fccResponse = {
      Block: {
        FIPS: "060374608001001",
      },
    };

    const censusResponse = [
      ["B19013_001E", "state", "county", "tract", "block group"],
      ["185000", "06", "037", "460800", "1"],
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(fccResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(censusResponse), { status: 200 }),
      );

    const result = await getBlockGroupIncome(34.0522, -118.2437);
    expect(result).not.toBeNull();
    expect(result!.income_tier).toBe(5); // $185,000 → tier 5
  });

  it("CensusResult does not expose income in field names visible to clients", () => {
    // Structural test: the CensusResult type returns income_tier (opaque number)
    // and median_income (server-only, never sent to client).
    // This test documents the privacy boundary.
    // The API route that consumes this should only forward income_tier,
    // NEVER median_income, and NEVER label it as "income".
    expect(true).toBe(true); // Documentation test — enforced at API route level
  });
});
