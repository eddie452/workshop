import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPropertyData, lookupFixture } from "@/lib/apis/batchdata";

/* ------------------------------------------------------------------ */
/* lookupFixture                                                       */
/* ------------------------------------------------------------------ */

describe("lookupFixture", () => {
  it("returns property data for a known fixture address", () => {
    const result = lookupFixture("123 Main St, Nashville, TN 37203");
    expect(result).not.toBeNull();
    expect(result!.year_built).toBe(1965);
    expect(result!.home_type).toBe("single_family");
    expect(result!.sqft).toBe(1850);
    expect(result!.source).toBe("fixture");
  });

  it("matches case-insensitively", () => {
    const result = lookupFixture("123 MAIN ST, NASHVILLE, TN 37203");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("fixture");
  });

  it("returns null for unknown address", () => {
    const result = lookupFixture("999 Nonexistent Rd, Nowhere, XX 00000");
    expect(result).toBeNull();
  });

  it("returns data for all 7 fixture addresses", () => {
    const addresses = [
      "123 Main St, Nashville, TN 37203",
      "456 Peachtree St NE, Atlanta, GA 30308",
      "789 Congress Ave, Austin, TX 78701",
      "321 Elm St, Dallas, TX 75201",
      "555 Oak Dr, Charlotte, NC 28202",
      "100 Broadway, New York, NY 10005",
      "200 Lake Shore Dr, Chicago, IL 60611",
    ];
    for (const addr of addresses) {
      const result = lookupFixture(addr);
      expect(result).not.toBeNull();
      expect(result!.source).toBe("fixture");
    }
  });

  it("each fixture has valid property data fields", () => {
    const result = lookupFixture("456 Peachtree St NE, Atlanta, GA 30308");
    expect(result).not.toBeNull();
    expect(typeof result!.year_built).toBe("number");
    expect(typeof result!.home_type).toBe("string");
    expect(typeof result!.sqft).toBe("number");
  });
});

/* ------------------------------------------------------------------ */
/* getPropertyData                                                     */
/* ------------------------------------------------------------------ */

describe("getPropertyData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to fixture when API key is not set", async () => {
    vi.stubEnv("BATCHDATA_API_KEY", "");
    const result = await getPropertyData(
      "123 Main St, Nashville, TN 37203",
    );
    expect(result).not.toBeNull();
    expect(result!.source).toBe("fixture");
  });

  it("returns null for unknown address when API is unavailable", async () => {
    vi.stubEnv("BATCHDATA_API_KEY", "");
    const result = await getPropertyData(
      "999 Nonexistent Rd, Nowhere, XX 00000",
    );
    expect(result).toBeNull();
  });

  it("returns API data when BatchData responds successfully", async () => {
    vi.stubEnv("BATCHDATA_API_KEY", "test-key");

    const mockApiResponse = {
      results: {
        properties: [
          {
            yearBuilt: 2010,
            propertyType: "Single Family Residential",
            livingArea: 2000,
          },
        ],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockApiResponse), { status: 200 }),
    );

    const result = await getPropertyData("456 Test Ave, Somewhere, TX 75001");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("api");
    expect(result!.year_built).toBe(2010);
    expect(result!.home_type).toBe("single_family");
    expect(result!.sqft).toBe(2000);
  });

  it("falls back to fixture when API returns error", async () => {
    vi.stubEnv("BATCHDATA_API_KEY", "test-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const result = await getPropertyData(
      "123 Main St, Nashville, TN 37203",
    );
    // Should fall back to fixture
    expect(result).not.toBeNull();
    expect(result!.source).toBe("fixture");
  });

  it("falls back to fixture when API throws network error", async () => {
    vi.stubEnv("BATCHDATA_API_KEY", "test-key");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await getPropertyData(
      "123 Main St, Nashville, TN 37203",
    );
    expect(result).not.toBeNull();
    expect(result!.source).toBe("fixture");
  });
});
