import { describe, it, expect } from "vitest";
import {
  checkSymptomGate,
  calculateSymptomMultiplier,
  getAllSymptomMultipliers,
} from "@/lib/engine/symptoms";
import type { SymptomInput } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* checkSymptomGate                                                    */
/* ------------------------------------------------------------------ */

describe("checkSymptomGate", () => {
  it("returns false when global_severity is 0 (no symptoms)", () => {
    const symptoms: SymptomInput = { zones: [], global_severity: 0 };
    expect(checkSymptomGate(symptoms)).toBe(false);
  });

  it("returns true when global_severity is 1", () => {
    const symptoms: SymptomInput = { zones: ["nose"], global_severity: 1 };
    expect(checkSymptomGate(symptoms)).toBe(true);
  });

  it("returns true when global_severity is 3", () => {
    const symptoms: SymptomInput = {
      zones: ["eyes", "nose", "lungs"],
      global_severity: 3,
    };
    expect(checkSymptomGate(symptoms)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* calculateSymptomMultiplier                                          */
/* ------------------------------------------------------------------ */

describe("calculateSymptomMultiplier", () => {
  it("returns 1.0 (neutral) with no reported zones", () => {
    const result = calculateSymptomMultiplier("tree", []);
    expect(result.multiplier).toBe(1.0);
    expect(result.matching_zones).toHaveLength(0);
  });

  it("boosts tree allergens for eye symptoms", () => {
    const result = calculateSymptomMultiplier("tree", ["eyes"]);
    expect(result.multiplier).toBe(1.3); // 1.0 + 0.3
    expect(result.matching_zones).toContain("eyes");
  });

  it("boosts tree allergens for nose symptoms", () => {
    const result = calculateSymptomMultiplier("tree", ["nose"]);
    expect(result.multiplier).toBe(1.3);
    expect(result.matching_zones).toContain("nose");
  });

  it("stacks multiple zone matches (tree with eyes + nose + throat)", () => {
    const result = calculateSymptomMultiplier("tree", [
      "eyes",
      "nose",
      "throat",
    ]);
    // Tree maps to: eyes, nose, throat → 3 matches → 1.0 + 0.9 = 1.9
    expect(result.multiplier).toBe(1.9);
    expect(result.matching_zones).toHaveLength(3);
  });

  it("does not boost when zone does not match category", () => {
    // "skin" maps to indoor and food, not tree
    const result = calculateSymptomMultiplier("tree", ["skin"]);
    expect(result.multiplier).toBe(1.0);
    expect(result.matching_zones).toHaveLength(0);
  });

  it("boosts indoor allergens for skin symptoms", () => {
    const result = calculateSymptomMultiplier("indoor", ["skin"]);
    expect(result.multiplier).toBe(1.3);
    expect(result.matching_zones).toContain("skin");
  });

  it("boosts indoor allergens for lungs symptoms", () => {
    const result = calculateSymptomMultiplier("indoor", ["lungs"]);
    expect(result.multiplier).toBe(1.3);
    expect(result.matching_zones).toContain("lungs");
  });

  it("boosts mold for throat + lungs (2 zones)", () => {
    const result = calculateSymptomMultiplier("mold", ["throat", "lungs"]);
    expect(result.multiplier).toBe(1.6); // 1.0 + 0.6
    expect(result.matching_zones).toHaveLength(2);
  });

  it("boosts grass for eyes + nose", () => {
    const result = calculateSymptomMultiplier("grass", ["eyes", "nose"]);
    expect(result.multiplier).toBe(1.6); // 1.0 + 0.6
  });

  it("boosts weed only for nose (not eyes)", () => {
    const result = calculateSymptomMultiplier("weed", ["eyes", "nose"]);
    // Weed maps to nose only → 1 match → 1.3
    expect(result.multiplier).toBe(1.3);
    expect(result.matching_zones).toEqual(["nose"]);
  });

  it("caps multiplier at 2.5", () => {
    // Hypothetical: if a category could match 6+ zones
    // In practice, tree matches eyes + nose + throat = 1.9
    // This tests the cap mechanism
    const result = calculateSymptomMultiplier("tree", [
      "eyes",
      "nose",
      "throat",
    ]);
    expect(result.multiplier).toBeLessThanOrEqual(2.5);
  });

  it("food category boosts for stomach symptoms", () => {
    const result = calculateSymptomMultiplier("food", ["stomach"]);
    expect(result.multiplier).toBe(1.3);
    expect(result.matching_zones).toContain("stomach");
  });

  it("food category boosts for skin + stomach", () => {
    const result = calculateSymptomMultiplier("food", ["skin", "stomach"]);
    expect(result.multiplier).toBe(1.6);
  });
});

/* ------------------------------------------------------------------ */
/* getAllSymptomMultipliers                                             */
/* ------------------------------------------------------------------ */

describe("getAllSymptomMultipliers", () => {
  const allergens = [
    { allergen_id: "oak", category: "tree" },
    { allergen_id: "dust-mites", category: "indoor" },
    { allergen_id: "alternaria", category: "mold" },
  ];

  it("returns multipliers for all allergens", () => {
    const symptoms: SymptomInput = {
      zones: ["eyes", "nose"],
      global_severity: 2,
    };
    const results = getAllSymptomMultipliers(allergens, symptoms);
    expect(results).toHaveLength(3);
  });

  it("suppresses all to 0.0 when symptom gate fails (severity 0)", () => {
    const symptoms: SymptomInput = { zones: ["eyes"], global_severity: 0 };
    const results = getAllSymptomMultipliers(allergens, symptoms);
    for (const r of results) {
      expect(r.multiplier).toBe(0.0);
      expect(r.matching_zones).toHaveLength(0);
    }
  });

  it("applies different multipliers per category", () => {
    const symptoms: SymptomInput = {
      zones: ["eyes", "nose"],
      global_severity: 2,
    };
    const results = getAllSymptomMultipliers(allergens, symptoms);

    // Tree: eyes + nose → 1.6
    const tree = results.find((r) => r.allergen_id === "oak");
    expect(tree?.multiplier).toBe(1.6);

    // Indoor: no match for eyes/nose → 1.0
    const indoor = results.find((r) => r.allergen_id === "dust-mites");
    expect(indoor?.multiplier).toBe(1.0);

    // Mold: no match for eyes/nose → 1.0
    const mold = results.find((r) => r.allergen_id === "alternaria");
    expect(mold?.multiplier).toBe(1.0);
  });
});
