import { describe, it, expect } from "vitest";
import {
  calculatePriorProbability,
  initializeElo,
  initializeAllElo,
  calculateKFactor,
  updateElo,
  clampElo,
} from "@/lib/engine/elo";
import type { Allergen, AllergenElo } from "@/lib/engine/types";
import { ELO_MIN, ELO_MAX, ELO_CENTER } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

const makeAllergen = (
  overrides: Partial<Allergen> = {},
): Allergen => ({
  id: "oak",
  common_name: "Oak",
  category: "tree",
  base_elo: 1400,
  region_northeast: 3,
  region_midwest: 3,
  region_northwest: 1,
  region_south_central: 4,
  region_southeast: 4,
  region_southwest: 2,
  ...overrides,
});

const makeAllergenElo = (
  overrides: Partial<AllergenElo> = {},
): AllergenElo => ({
  allergen_id: "oak",
  elo_score: 1000,
  positive_signals: 0,
  negative_signals: 0,
  ...overrides,
});

const testAllergens: Allergen[] = [
  makeAllergen({ id: "oak", base_elo: 1400, region_southeast: 4 }),
  makeAllergen({ id: "ragweed", base_elo: 1600, region_southeast: 3 }),
  makeAllergen({ id: "dust-mites", base_elo: 1200, region_southeast: 2 }),
];

/* ------------------------------------------------------------------ */
/* calculatePriorProbability                                           */
/* ------------------------------------------------------------------ */

describe("calculatePriorProbability", () => {
  it("returns a value between 0 and 1", () => {
    const pS = calculatePriorProbability(
      testAllergens[0],
      "Southeast",
      testAllergens,
    );
    expect(pS).toBeGreaterThanOrEqual(0);
    expect(pS).toBeLessThanOrEqual(1);
  });

  it("higher base_elo and regional presence yields higher P(S)", () => {
    const pOak = calculatePriorProbability(
      testAllergens[0], // base_elo: 1400, SE: 4
      "Southeast",
      testAllergens,
    );
    const pDust = calculatePriorProbability(
      testAllergens[2], // base_elo: 1200, SE: 2
      "Southeast",
      testAllergens,
    );
    expect(pOak).toBeGreaterThan(pDust);
  });

  it("all probabilities sum to 1 across allergen set", () => {
    const total = testAllergens.reduce((sum, a) => {
      return sum + calculatePriorProbability(a, "Southeast", testAllergens);
    }, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("returns 0 when all scores are 0", () => {
    const zeroAllergens = [
      makeAllergen({ id: "a", base_elo: 0, region_southeast: 0 }),
      makeAllergen({ id: "b", base_elo: 0, region_southeast: 0 }),
    ];
    const pS = calculatePriorProbability(
      zeroAllergens[0],
      "Southeast",
      zeroAllergens,
    );
    expect(pS).toBe(0);
  });

  it("uses the correct regional field for different regions", () => {
    const allergen = makeAllergen({
      region_northeast: 4,
      region_southwest: 1,
    });
    const pNE = calculatePriorProbability(
      allergen,
      "Northeast",
      [allergen],
    );
    const pSW = calculatePriorProbability(
      allergen,
      "Southwest",
      [allergen],
    );
    // Single allergen → both should be 1.0 (sole probability)
    expect(pNE).toBeCloseTo(1.0);
    expect(pSW).toBeCloseTo(1.0);
  });
});

/* ------------------------------------------------------------------ */
/* initializeElo                                                       */
/* ------------------------------------------------------------------ */

describe("initializeElo", () => {
  it("P(S) = 0.5 produces center Elo (1000)", () => {
    expect(initializeElo(0.5)).toBe(ELO_CENTER);
  });

  it("P(S) > 0.5 produces Elo above center", () => {
    expect(initializeElo(0.8)).toBeGreaterThan(ELO_CENTER);
  });

  it("P(S) < 0.5 produces Elo below center", () => {
    expect(initializeElo(0.2)).toBeLessThan(ELO_CENTER);
  });

  it("P(S) = 0 produces minimum-bounded Elo", () => {
    const elo = initializeElo(0);
    expect(elo).toBeGreaterThanOrEqual(ELO_MIN);
  });

  it("P(S) = 1 produces maximum-bounded Elo", () => {
    const elo = initializeElo(1);
    expect(elo).toBeLessThanOrEqual(ELO_MAX);
  });

  it("result is always an integer", () => {
    expect(Number.isInteger(initializeElo(0.333))).toBe(true);
    expect(Number.isInteger(initializeElo(0.777))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* initializeAllElo                                                    */
/* ------------------------------------------------------------------ */

describe("initializeAllElo", () => {
  it("returns one Elo record per allergen", () => {
    const results = initializeAllElo(testAllergens, "Southeast");
    expect(results).toHaveLength(testAllergens.length);
  });

  it("all records start with 0 signals", () => {
    const results = initializeAllElo(testAllergens, "Southeast");
    for (const r of results) {
      expect(r.positive_signals).toBe(0);
      expect(r.negative_signals).toBe(0);
    }
  });

  it("all Elo scores are within bounds", () => {
    const results = initializeAllElo(testAllergens, "Southeast");
    for (const r of results) {
      expect(r.elo_score).toBeGreaterThanOrEqual(ELO_MIN);
      expect(r.elo_score).toBeLessThanOrEqual(ELO_MAX);
    }
  });

  it("allergen IDs match input allergens", () => {
    const results = initializeAllElo(testAllergens, "Southeast");
    const ids = results.map((r) => r.allergen_id);
    expect(ids).toEqual(testAllergens.map((a) => a.id));
  });
});

/* ------------------------------------------------------------------ */
/* calculateKFactor                                                    */
/* ------------------------------------------------------------------ */

describe("calculateKFactor", () => {
  it("returns maximum K for 0 signals (volatile early)", () => {
    const k = calculateKFactor(0);
    expect(k).toBe(64);
  });

  it("K decreases as signals increase", () => {
    const k0 = calculateKFactor(0);
    const k10 = calculateKFactor(10);
    const k50 = calculateKFactor(50);
    expect(k0).toBeGreaterThan(k10);
    expect(k10).toBeGreaterThan(k50);
  });

  it("K never drops below minimum (8)", () => {
    const k = calculateKFactor(10000);
    expect(k).toBeGreaterThanOrEqual(8);
  });

  it("K at 10 signals is lower than K at 0", () => {
    const k0 = calculateKFactor(0);
    const k10 = calculateKFactor(10);
    expect(k10).toBeLessThan(k0);
    // K = 64 / (1 + 0.1 * 10) = 64 / 2 = 32
    expect(k10).toBe(32);
  });
});

/* ------------------------------------------------------------------ */
/* updateElo                                                           */
/* ------------------------------------------------------------------ */

describe("updateElo", () => {
  it("positive delta increases Elo", () => {
    const current = makeAllergenElo({ elo_score: 1000 });
    const result = updateElo(current, 1.0);
    expect(result.new_elo).toBeGreaterThan(1000);
  });

  it("negative delta decreases Elo", () => {
    const current = makeAllergenElo({ elo_score: 1000 });
    const result = updateElo(current, -1.0);
    expect(result.new_elo).toBeLessThan(1000);
  });

  it("zero delta leaves Elo unchanged", () => {
    const current = makeAllergenElo({ elo_score: 1000 });
    const result = updateElo(current, 0);
    expect(result.new_elo).toBe(1000);
  });

  it("Elo stays within bounds after extreme positive input", () => {
    const current = makeAllergenElo({ elo_score: 2900 });
    const result = updateElo(current, 100);
    expect(result.new_elo).toBeLessThanOrEqual(ELO_MAX);
  });

  it("Elo stays within bounds after extreme negative input", () => {
    const current = makeAllergenElo({ elo_score: 200 });
    const result = updateElo(current, -100);
    expect(result.new_elo).toBeGreaterThanOrEqual(ELO_MIN);
  });

  it("uses correct K-factor based on signal count", () => {
    const current = makeAllergenElo({
      elo_score: 1000,
      positive_signals: 5,
      negative_signals: 5, // total = 10
    });
    const result = updateElo(current, 1.0);
    // K = 64 / (1 + 0.1 * 10) = 32
    expect(result.k_factor).toBe(32);
    expect(result.new_elo).toBe(1032);
  });

  it("returns correct delta", () => {
    const current = makeAllergenElo({ elo_score: 1000 });
    const result = updateElo(current, 1.0);
    expect(result.delta).toBe(result.new_elo - 1000);
  });
});

/* ------------------------------------------------------------------ */
/* clampElo                                                            */
/* ------------------------------------------------------------------ */

describe("clampElo", () => {
  it("clamps below minimum to ELO_MIN", () => {
    expect(clampElo(-500)).toBe(ELO_MIN);
    expect(clampElo(0)).toBe(ELO_MIN);
    expect(clampElo(50)).toBe(ELO_MIN);
  });

  it("clamps above maximum to ELO_MAX", () => {
    expect(clampElo(5000)).toBe(ELO_MAX);
    expect(clampElo(3001)).toBe(ELO_MAX);
  });

  it("passes through values within bounds", () => {
    expect(clampElo(1000)).toBe(1000);
    expect(clampElo(100)).toBe(100);
    expect(clampElo(3000)).toBe(3000);
  });

  it("rounds to nearest integer", () => {
    expect(clampElo(1000.7)).toBe(1001);
    expect(clampElo(1000.3)).toBe(1000);
  });
});
