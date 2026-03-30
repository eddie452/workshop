import { describe, it, expect } from "vitest";
import {
  getSeasonalMultiplier,
  getSeasonalSeverity,
  getAllSeasonalMultipliers,
  isAllergenActive,
} from "@/lib/engine/seasonal";

/* ------------------------------------------------------------------ */
/* getSeasonalMultiplier                                               */
/* ------------------------------------------------------------------ */

describe("getSeasonalMultiplier", () => {
  it("returns 0.0 for inactive month (oak in January Northeast)", () => {
    // Oak is inactive in January in Northeast (winter)
    const multiplier = getSeasonalMultiplier("oak", "Northeast", 1);
    expect(multiplier).toBe(0.0);
  });

  it("returns 3.0 for severe month (oak in spring Southeast)", () => {
    // Oak peaks in spring in Southeast — should be severe
    const multiplier = getSeasonalMultiplier("oak", "Southeast", 4);
    expect(multiplier).toBe(3.0);
  });

  it("returns 1.2 for mild month", () => {
    // Find a mild entry — oak in February Northeast should be mild
    const multiplier = getSeasonalMultiplier("oak", "Northeast", 2);
    expect(multiplier).toBe(1.2);
  });

  it("returns valid multiplier values only (0.0, 1.2, 2.0, or 3.0)", () => {
    const validMultipliers = [0.0, 1.2, 2.0, 3.0];
    // Check a spread of allergens and months
    const allergens = ["oak", "ragweed", "dust-mites", "alternaria"];
    const months = [1, 4, 7, 10];
    for (const allergenId of allergens) {
      for (const month of months) {
        const m = getSeasonalMultiplier(allergenId, "Southeast", month);
        expect(validMultipliers).toContain(m);
      }
    }
  });

  it("returns 0.0 for unknown allergen", () => {
    const multiplier = getSeasonalMultiplier(
      "nonexistent-allergen",
      "Southeast",
      4,
    );
    expect(multiplier).toBe(0.0);
  });

  it("indoor allergens are active year-round", () => {
    // Dust mites should be active all 12 months
    let activeCount = 0;
    for (let month = 1; month <= 12; month++) {
      const m = getSeasonalMultiplier("dust-mites", "Southeast", month);
      if (m > 0) activeCount++;
    }
    expect(activeCount).toBe(12);
  });
});

/* ------------------------------------------------------------------ */
/* getSeasonalSeverity                                                 */
/* ------------------------------------------------------------------ */

describe("getSeasonalSeverity", () => {
  it("returns 'inactive' for inactive month", () => {
    const severity = getSeasonalSeverity("oak", "Northeast", 1);
    expect(severity).toBe("inactive");
  });

  it("returns valid severity values", () => {
    const validSeverities = ["inactive", "mild", "moderate", "severe"];
    const severity = getSeasonalSeverity("oak", "Southeast", 4);
    expect(validSeverities).toContain(severity);
  });

  it("returns 'inactive' for unknown allergen", () => {
    const severity = getSeasonalSeverity("fake-allergen", "Southeast", 4);
    expect(severity).toBe("inactive");
  });
});

/* ------------------------------------------------------------------ */
/* getAllSeasonalMultipliers                                            */
/* ------------------------------------------------------------------ */

describe("getAllSeasonalMultipliers", () => {
  it("returns multipliers for all requested allergens", () => {
    const ids = ["oak", "ragweed", "dust-mites"];
    const results = getAllSeasonalMultipliers(ids, "Southeast", 4);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.allergen_id)).toEqual(ids);
  });

  it("each result has severity and multiplier fields", () => {
    const results = getAllSeasonalMultipliers(["oak"], "Southeast", 4);
    expect(results[0]).toHaveProperty("allergen_id", "oak");
    expect(results[0]).toHaveProperty("severity");
    expect(results[0]).toHaveProperty("multiplier");
  });
});

/* ------------------------------------------------------------------ */
/* isAllergenActive                                                    */
/* ------------------------------------------------------------------ */

describe("isAllergenActive", () => {
  it("returns false for inactive allergen/month", () => {
    expect(isAllergenActive("oak", "Northeast", 1)).toBe(false);
  });

  it("returns true for active allergen/month", () => {
    expect(isAllergenActive("oak", "Southeast", 4)).toBe(true);
  });

  it("returns false for unknown allergen", () => {
    expect(isAllergenActive("nonexistent", "Southeast", 4)).toBe(false);
  });
});
