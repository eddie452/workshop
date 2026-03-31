import { describe, it, expect } from "vitest";
import {
  getConfidenceTier,
  getConfidenceTierBySignals,
  getAllConfidenceTiers,
  getConfidenceLabel,
} from "@/lib/engine/confidence";

/* ------------------------------------------------------------------ */
/* getConfidenceTier                                                   */
/* ------------------------------------------------------------------ */

describe("getConfidenceTier", () => {
  it("returns 'very_high' for Elo >= 1400", () => {
    expect(getConfidenceTier(1400)).toBe("very_high");
    expect(getConfidenceTier(1500)).toBe("very_high");
    expect(getConfidenceTier(3000)).toBe("very_high");
  });

  it("returns 'high' for 1200 <= Elo < 1400", () => {
    expect(getConfidenceTier(1200)).toBe("high");
    expect(getConfidenceTier(1300)).toBe("high");
    expect(getConfidenceTier(1399)).toBe("high");
  });

  it("returns 'medium' for 900 <= Elo < 1200", () => {
    expect(getConfidenceTier(900)).toBe("medium");
    expect(getConfidenceTier(1000)).toBe("medium");
    expect(getConfidenceTier(1199)).toBe("medium");
  });

  it("returns 'low' for Elo < 900", () => {
    expect(getConfidenceTier(899)).toBe("low");
    expect(getConfidenceTier(500)).toBe("low");
    expect(getConfidenceTier(100)).toBe("low");
  });

  it("handles edge cases at tier boundaries", () => {
    expect(getConfidenceTier(1400)).toBe("very_high");
    expect(getConfidenceTier(1399)).toBe("high");
    expect(getConfidenceTier(1200)).toBe("high");
    expect(getConfidenceTier(1199)).toBe("medium");
    expect(getConfidenceTier(900)).toBe("medium");
    expect(getConfidenceTier(899)).toBe("low");
  });
});

/* ------------------------------------------------------------------ */
/* getConfidenceTierBySignals                                          */
/* ------------------------------------------------------------------ */

describe("getConfidenceTierBySignals", () => {
  it("returns 'very_high' for totalSignals >= 30", () => {
    expect(getConfidenceTierBySignals(30)).toBe("very_high");
    expect(getConfidenceTierBySignals(50)).toBe("very_high");
  });

  it("returns 'high' for 14 <= totalSignals < 30", () => {
    expect(getConfidenceTierBySignals(14)).toBe("high");
    expect(getConfidenceTierBySignals(29)).toBe("high");
  });

  it("returns 'medium' for 7 <= totalSignals < 14", () => {
    expect(getConfidenceTierBySignals(7)).toBe("medium");
    expect(getConfidenceTierBySignals(13)).toBe("medium");
  });

  it("returns 'low' for totalSignals < 7", () => {
    expect(getConfidenceTierBySignals(6)).toBe("low");
    expect(getConfidenceTierBySignals(0)).toBe("low");
  });

  it("handles edge cases at tier boundaries", () => {
    expect(getConfidenceTierBySignals(30)).toBe("very_high");
    expect(getConfidenceTierBySignals(29)).toBe("high");
    expect(getConfidenceTierBySignals(14)).toBe("high");
    expect(getConfidenceTierBySignals(13)).toBe("medium");
    expect(getConfidenceTierBySignals(7)).toBe("medium");
    expect(getConfidenceTierBySignals(6)).toBe("low");
  });
});

/* ------------------------------------------------------------------ */
/* getAllConfidenceTiers                                                */
/* ------------------------------------------------------------------ */

describe("getAllConfidenceTiers", () => {
  it("returns tiers for all allergens", () => {
    const input = [
      { allergen_id: "oak", elo_score: 1500 },
      { allergen_id: "ragweed", elo_score: 1100 },
      { allergen_id: "dust-mites", elo_score: 800 },
    ];
    const results = getAllConfidenceTiers(input);
    expect(results).toHaveLength(3);
    expect(results[0].tier).toBe("very_high");
    expect(results[1].tier).toBe("medium");
    expect(results[2].tier).toBe("low");
  });

  it("preserves allergen_id and elo_score", () => {
    const input = [{ allergen_id: "oak", elo_score: 1500 }];
    const results = getAllConfidenceTiers(input);
    expect(results[0].allergen_id).toBe("oak");
    expect(results[0].elo_score).toBe(1500);
  });

  it("returns empty array for empty input", () => {
    const results = getAllConfidenceTiers([]);
    expect(results).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* getConfidenceLabel                                                  */
/* ------------------------------------------------------------------ */

describe("getConfidenceLabel", () => {
  it("returns human-readable labels", () => {
    expect(getConfidenceLabel("very_high")).toBe("Very High");
    expect(getConfidenceLabel("high")).toBe("High");
    expect(getConfidenceLabel("medium")).toBe("Medium");
    expect(getConfidenceLabel("low")).toBe("Low");
  });
});
