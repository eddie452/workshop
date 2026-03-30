import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/allergens/seasonal/route";
import calendarData from "@/lib/data/seasonal-calendar.json";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/allergens/seasonal");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe("GET /api/allergens/seasonal", () => {
  it("returns 400 when region is missing", async () => {
    const response = GET(makeRequest({ month: "4" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when month is missing", async () => {
    const response = GET(makeRequest({ region: "Southeast" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid region", async () => {
    const response = GET(makeRequest({ region: "West", month: "4" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid month", async () => {
    const response = GET(makeRequest({ region: "Southeast", month: "13" }));
    expect(response.status).toBe(400);
  });

  it("returns entries for a valid region and month", async () => {
    const response = GET(makeRequest({ region: "Southeast", month: "4" }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("each entry has severity and multiplier fields", async () => {
    const response = GET(makeRequest({ region: "Southeast", month: "4" }));
    const body = await response.json();

    for (const entry of body) {
      expect(entry).toHaveProperty("allergen_id");
      expect(entry).toHaveProperty("allergen_name");
      expect(entry).toHaveProperty("region", "Southeast");
      expect(entry).toHaveProperty("month", 4);
      expect(entry).toHaveProperty("severity");
      expect(entry).toHaveProperty("multiplier");
      expect(["inactive", "mild", "moderate", "severe"]).toContain(
        entry.severity,
      );
    }
  });

  it("returns correct multipliers for each severity", async () => {
    const response = GET(makeRequest({ region: "Midwest", month: "8" }));
    const body = await response.json();

    const multiplierMap: Record<string, number> = {
      inactive: 0.0,
      mild: 1.2,
      moderate: 2.0,
      severe: 3.0,
    };

    for (const entry of body) {
      expect(entry.multiplier).toBe(multiplierMap[entry.severity]);
    }
  });

  it("returns only entries matching requested region and month", async () => {
    const response = GET(
      makeRequest({ region: "South Central", month: "9" }),
    );
    const body = await response.json();

    for (const entry of body) {
      expect(entry.region).toBe("South Central");
      expect(entry.month).toBe(9);
    }
  });
});

describe("seasonal-calendar.json", () => {
  const regions = [
    "Northeast",
    "Midwest",
    "Northwest",
    "South Central",
    "Southeast",
    "Southwest",
  ];

  it("covers all 6 regions", () => {
    const presentRegions = new Set(calendarData.map((e) => e.region));
    for (const region of regions) {
      expect(presentRegions).toContain(region);
    }
  });

  it("covers all 12 months", () => {
    const months = new Set(calendarData.map((e) => e.month));
    for (let m = 1; m <= 12; m++) {
      expect(months).toContain(m);
    }
  });

  it("covers all 6 regions x 12 months for each allergen", () => {
    const allergenIds = new Set(calendarData.map((e) => e.allergen_id));

    for (const allergenId of allergenIds) {
      const entries = calendarData.filter((e) => e.allergen_id === allergenId);
      const regionMonthPairs = new Set(
        entries.map((e) => `${e.region}|${e.month}`),
      );

      // Each allergen should have 6 regions x 12 months = 72 entries
      expect(regionMonthPairs.size).toBe(72);
    }
  });

  it("all severity values are valid", () => {
    const validSeverities = ["inactive", "mild", "moderate", "severe"];
    for (const entry of calendarData) {
      expect(validSeverities).toContain(entry.severity);
    }
  });

  it("activity_level is between 0 and 3", () => {
    for (const entry of calendarData) {
      expect(entry.activity_level).toBeGreaterThanOrEqual(0);
      expect(entry.activity_level).toBeLessThanOrEqual(3);
    }
  });
});
