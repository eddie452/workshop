import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/allergens/route";
import allergensData from "@/lib/data/allergens-seed.json";

describe("GET /api/allergens", () => {
  it("returns 200 with an array of allergens", async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(40);
  });

  it("each allergen has required fields", async () => {
    const response = GET();
    const body = await response.json();

    for (const allergen of body) {
      expect(allergen).toHaveProperty("id");
      expect(allergen).toHaveProperty("common_name");
      expect(allergen).toHaveProperty("category");
      expect(allergen).toHaveProperty("base_elo");
      expect(allergen).toHaveProperty("region_northeast");
      expect(allergen).toHaveProperty("region_southeast");
    }
  });

  it("contains known allergens", async () => {
    const response = GET();
    const body = await response.json();
    const ids = body.map((a: { id: string }) => a.id);

    expect(ids).toContain("oak");
    expect(ids).toContain("ragweed");
    expect(ids).toContain("dust-mites");
    expect(ids).toContain("bermuda-grass");
    expect(ids).toContain("alternaria");
  });
});

describe("allergens-seed.json", () => {
  it("has at least 40 allergens", () => {
    expect(allergensData.length).toBeGreaterThanOrEqual(40);
  });

  it("includes all expected categories", () => {
    const categories = new Set(allergensData.map((a) => a.category));
    expect(categories).toContain("tree");
    expect(categories).toContain("grass");
    expect(categories).toContain("weed");
    expect(categories).toContain("mold");
    expect(categories).toContain("indoor");
  });

  it("each allergen has a valid category", () => {
    const validCategories = ["tree", "grass", "weed", "mold", "indoor", "food"];
    for (const allergen of allergensData) {
      expect(validCategories).toContain(allergen.category);
    }
  });

  it("has unique IDs", () => {
    const ids = allergensData.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
