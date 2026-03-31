/**
 * PFAS Data Retrieval Tests
 *
 * Validates that getPfasData correctly extracts cross-reactive food
 * data from the allergen seed data based on provided allergen IDs.
 */

import { describe, it, expect } from "vitest";
import { getPfasData } from "@/lib/pfas/get-pfas-data";

describe("getPfasData", () => {
  it("returns cross-reactive foods for birch (top allergen with PFAS data)", () => {
    const result = getPfasData(["birch"]);
    expect(result.hasData).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].allergen_id).toBe("birch");
    expect(result.entries[0].common_name).toBe("Birch");
    expect(result.entries[0].pfas_severity).toBe("moderate");
    expect(result.entries[0].cross_reactive_foods).toContain("apple");
    expect(result.entries[0].cross_reactive_foods).toContain("celery");
  });

  it("returns data for multiple allergens with PFAS cross-reactivity", () => {
    const result = getPfasData(["birch", "ragweed", "oak"]);
    expect(result.hasData).toBe(true);
    expect(result.entries).toHaveLength(3);
    const ids = result.entries.map((e) => e.allergen_id);
    expect(ids).toContain("birch");
    expect(ids).toContain("ragweed");
    expect(ids).toContain("oak");
  });

  it("excludes allergens with pfas_severity = none", () => {
    // cedar-juniper has cross_reactive_foods: [] and pfas_severity: "none"
    const result = getPfasData(["cedar-juniper"]);
    expect(result.hasData).toBe(false);
    expect(result.entries).toHaveLength(0);
  });

  it("excludes allergens with empty cross_reactive_foods", () => {
    const result = getPfasData(["cedar-juniper"]);
    expect(result.entries).toHaveLength(0);
  });

  it("returns empty result for allergen IDs not in seed data", () => {
    const result = getPfasData(["nonexistent-allergen"]);
    expect(result.hasData).toBe(false);
    expect(result.entries).toHaveLength(0);
  });

  it("returns empty result for empty input array", () => {
    const result = getPfasData([]);
    expect(result.hasData).toBe(false);
    expect(result.entries).toHaveLength(0);
  });

  it("food list matches allergen seed data (not hardcoded)", () => {
    // Ragweed has specific cross-reactive foods in seed data
    const result = getPfasData(["ragweed"]);
    expect(result.entries[0].cross_reactive_foods).toContain("banana");
    expect(result.entries[0].cross_reactive_foods).toContain("melon");
    expect(result.entries[0].cross_reactive_foods).toContain("watermelon");
  });

  it("includes category from seed data", () => {
    const result = getPfasData(["birch"]);
    expect(result.entries[0].category).toBe("tree");
  });

  it("handles mixed allergens — some with PFAS, some without", () => {
    // birch has PFAS, cedar-juniper does not
    const result = getPfasData(["birch", "cedar-juniper"]);
    expect(result.hasData).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].allergen_id).toBe("birch");
  });

  it("filters to only requested allergen IDs (top 5 scenario)", () => {
    // Only request a subset of allergens
    const result = getPfasData(["oak"]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].allergen_id).toBe("oak");
    // Should not include birch even though it has PFAS data
    const ids = result.entries.map((e) => e.allergen_id);
    expect(ids).not.toContain("birch");
  });
});
