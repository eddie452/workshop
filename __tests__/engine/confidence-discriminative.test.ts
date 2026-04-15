/**
 * Two-layer confidence model tests (issue #193)
 *
 * Covers the new discriminative (Elo-separation sigmoid) and
 * posterior (Monte Carlo top-K frequency) APIs added in
 * `lib/engine/confidence-score.ts`. The legacy signal-count
 * function is covered by `./confidence-score.test.ts` which
 * continues to pass unchanged (the old export is retained).
 */

import { describe, it, expect } from "vitest";
import {
  getDiscriminativeConfidence,
  getPosteriorConfidence,
  getConfidenceTierByPosterior,
  POSTERIOR_DEFAULT_RUNS,
} from "@/lib/engine/confidence-score";
import type { TournamentEntry } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Build a synthetic leaderboard with descending composite scores. */
function buildLeaderboard(
  size: number,
  top: number = 1800,
  bottom: number = 800,
): TournamentEntry[] {
  const step = size > 1 ? (top - bottom) / (size - 1) : 0;
  return Array.from({ length: size }, (_, i) => ({
    allergen_id: `a${String(i + 1).padStart(3, "0")}`,
    common_name: `Allergen ${i + 1}`,
    category: "tree",
    composite_score: top - i * step,
    tier: "low" as const,
  }));
}

/* ------------------------------------------------------------------ */
/* Discriminative layer                                                */
/* ------------------------------------------------------------------ */

describe("getDiscriminativeConfidence", () => {
  it("returns 0.5 when elo equals the reference", () => {
    expect(
      getDiscriminativeConfidence(1000, [500, 1000, 1500]),
    ).toBeCloseTo(0.5, 10);
  });

  it("returns near 1.0 for an elo far above the reference", () => {
    const score = getDiscriminativeConfidence(2500, [500, 1000, 1500]);
    expect(score).toBeGreaterThan(0.99);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns near 0.0 for an elo far below the reference", () => {
    // k = 1/200, delta = -900 → sigmoid(-4.5) ≈ 0.011
    const score = getDiscriminativeConfidence(100, [800, 1000, 1200]);
    expect(score).toBeLessThan(0.02);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("is monotonic in elo for a fixed reference", () => {
    const neighbors = [800, 1000, 1200];
    const lo = getDiscriminativeConfidence(900, neighbors);
    const mid = getDiscriminativeConfidence(1100, neighbors);
    const hi = getDiscriminativeConfidence(1300, neighbors);
    expect(lo).toBeLessThan(mid);
    expect(mid).toBeLessThan(hi);
  });

  it("is deterministic — same inputs produce same outputs", () => {
    const a = getDiscriminativeConfidence(1234, [500, 1000, 1500, 2000]);
    const b = getDiscriminativeConfidence(1234, [500, 1000, 1500, 2000]);
    expect(a).toBe(b);
  });

  it("handles degenerate empty neighbor list by returning 0.5", () => {
    expect(getDiscriminativeConfidence(1000, [])).toBeCloseTo(0.5, 10);
  });

  it.each([8, 16, 32])(
    "separates rank 1 from rank N on a %i-size leaderboard (DoD #193)",
    (size) => {
      const leaderboard = buildLeaderboard(size);
      const elos = leaderboard.map((e) => e.composite_score);
      const top = getDiscriminativeConfidence(elos[0], elos);
      const bottom = getDiscriminativeConfidence(elos[elos.length - 1], elos);
      expect(top).toBeGreaterThan(bottom);
      // Visible separation, not a 21% flat line.
      expect(top - bottom).toBeGreaterThan(0.4);
    },
  );
});

/* ------------------------------------------------------------------ */
/* Posterior layer                                                     */
/* ------------------------------------------------------------------ */

describe("getPosteriorConfidence", () => {
  it("returns an empty map for an empty leaderboard", () => {
    expect(getPosteriorConfidence([])).toEqual({});
  });

  it("returns 1.0 for the single allergen in a 1-entry leaderboard (degenerate)", () => {
    const leaderboard = buildLeaderboard(1);
    const posterior = getPosteriorConfidence(leaderboard, { seed: 1 });
    expect(posterior[leaderboard[0].allergen_id]).toBe(1);
  });

  it("is deterministic under a fixed seed", () => {
    const leaderboard = buildLeaderboard(16);
    const a = getPosteriorConfidence(leaderboard, { seed: 42, runs: 200 });
    const b = getPosteriorConfidence(leaderboard, { seed: 42, runs: 200 });
    expect(a).toEqual(b);
  });

  it("produces different outputs for different seeds (with noise)", () => {
    // With noise > 0 and a non-degenerate leaderboard, different
    // seeds should yield different tallies for at least some
    // borderline allergens.
    const leaderboard = buildLeaderboard(16);
    const a = getPosteriorConfidence(leaderboard, {
      seed: 1,
      runs: 200,
      noise: 0.5,
    });
    const b = getPosteriorConfidence(leaderboard, {
      seed: 2,
      runs: 200,
      noise: 0.5,
    });
    expect(a).not.toEqual(b);
  });

  it("saturates at 1.0 when one allergen dominates every run", () => {
    // Huge gap + small noise → #1 always wins top-K.
    const leaderboard: TournamentEntry[] = [
      {
        allergen_id: "dominator",
        common_name: "Dominator",
        category: "tree",
        composite_score: 5000,
        tier: "low",
      },
      ...buildLeaderboard(7, 1000, 500),
    ];
    const posterior = getPosteriorConfidence(leaderboard, {
      seed: 0,
      runs: 200,
      topK: 4,
      noise: 0.1,
    });
    expect(posterior["dominator"]).toBe(1);
  });

  it("floors at 0 when an allergen is far outside top-K with small noise", () => {
    // Allergen at the bottom of a 16-size leaderboard, topK=4,
    // tiny noise → should never finish top-4.
    const leaderboard = buildLeaderboard(16, 2000, 500);
    const posterior = getPosteriorConfidence(leaderboard, {
      seed: 7,
      runs: 200,
      topK: 4,
      noise: 0.05,
    });
    const lastId = leaderboard[leaderboard.length - 1].allergen_id;
    expect(posterior[lastId]).toBe(0);
  });

  it("all posterior values are in [0, 1]", () => {
    const leaderboard = buildLeaderboard(32);
    const posterior = getPosteriorConfidence(leaderboard, {
      seed: 13,
      runs: 100,
      noise: 0.5,
    });
    for (const v of Object.values(posterior)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("top-K posteriors sum to exactly topK (conservation)", () => {
    // Every run contributes exactly `topK` allergens to the tally,
    // so the total across all allergens should be runs * topK / runs = topK.
    const leaderboard = buildLeaderboard(16);
    const runs = 200;
    const topK = 4;
    const posterior = getPosteriorConfidence(leaderboard, {
      seed: 99,
      runs,
      topK,
      noise: 0.3,
    });
    const total = Object.values(posterior).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(topK, 10);
  });

  it("uses the documented default run count when runs is omitted", () => {
    // Smoke test: output for a single seed is stable across two
    // calls with default runs.
    const leaderboard = buildLeaderboard(8);
    const a = getPosteriorConfidence(leaderboard, { seed: 0 });
    const b = getPosteriorConfidence(leaderboard, {
      seed: 0,
      runs: POSTERIOR_DEFAULT_RUNS,
    });
    expect(a).toEqual(b);
  });
});

/* ------------------------------------------------------------------ */
/* Tier derivation from posterior                                      */
/* ------------------------------------------------------------------ */

describe("getConfidenceTierByPosterior", () => {
  it("maps posterior bands to the canonical tier strings", () => {
    expect(getConfidenceTierByPosterior(0)).toBe("low");
    expect(getConfidenceTierByPosterior(0.49)).toBe("low");
    expect(getConfidenceTierByPosterior(0.5)).toBe("medium");
    expect(getConfidenceTierByPosterior(0.74)).toBe("medium");
    expect(getConfidenceTierByPosterior(0.75)).toBe("high");
    expect(getConfidenceTierByPosterior(0.89)).toBe("high");
    expect(getConfidenceTierByPosterior(0.9)).toBe("very_high");
    expect(getConfidenceTierByPosterior(1)).toBe("very_high");
  });

  it("treats NaN posterior as low (defensive)", () => {
    expect(getConfidenceTierByPosterior(NaN)).toBe("low");
  });
});
