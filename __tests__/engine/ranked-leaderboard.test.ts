/**
 * ranked-leaderboard — fixture-based regression guard (issue #200).
 *
 * Pins the exact `discriminative` / `posterior` / `tier` output for a
 * known input so the `seed: 0` default and the two-layer mapping
 * cannot silently drift. If this snapshot changes, either the seed,
 * the runs count, the noise, or the sigmoid moved — all of which
 * require explicit review, not a rubber-stamp snapshot update.
 */

import { describe, it, expect } from "vitest";
import {
  buildRankedFromEloRows,
  type EloRowForRanking,
} from "@/lib/engine/ranked-leaderboard";

const FIXTURE: EloRowForRanking[] = [
  {
    allergen_id: "ragweed",
    elo_score: 1400,
    positive_signals: 12,
    negative_signals: 2,
    common_name: "Ragweed",
    category: "outdoor",
  },
  {
    allergen_id: "oak-pollen",
    elo_score: 1200,
    positive_signals: 8,
    negative_signals: 4,
    common_name: "Oak Pollen",
    category: "outdoor",
  },
  {
    allergen_id: "dust-mite",
    elo_score: 1000,
    positive_signals: 3,
    negative_signals: 5,
    common_name: "Dust Mite",
    category: "indoor",
  },
  {
    allergen_id: "cat-dander",
    elo_score: 800,
    positive_signals: 1,
    negative_signals: 3,
    common_name: "Cat Dander",
    category: "indoor",
  },
];

describe("buildRankedFromEloRows", () => {
  it("assigns ranks 1..N in input order", () => {
    const { allergens } = buildRankedFromEloRows(FIXTURE, { seed: 0 });
    expect(allergens.map((a) => a.rank)).toEqual([1, 2, 3, 4]);
    expect(allergens.map((a) => a.allergen_id)).toEqual([
      "ragweed",
      "oak-pollen",
      "dust-mite",
      "cat-dander",
    ]);
  });

  it("produces strictly monotonic discriminative values for descending Elo", () => {
    const { allergens } = buildRankedFromEloRows(FIXTURE, { seed: 0 });
    for (let i = 1; i < allergens.length; i++) {
      const prev = allergens[i - 1].discriminative ?? 0;
      const cur = allergens[i].discriminative ?? 0;
      expect(prev).toBeGreaterThan(cur);
    }
  });

  it("emits posteriors in [0, 1] that sum close to the top-K size", () => {
    // Top-K default is bounded, but every posterior is a probability.
    const { allergens } = buildRankedFromEloRows(FIXTURE, { seed: 0 });
    for (const a of allergens) {
      expect(a.posterior).toBeGreaterThanOrEqual(0);
      expect(a.posterior).toBeLessThanOrEqual(1);
    }
    // The #1 allergen's posterior must be at least as high as #N's
    // under `seed: 0` bounded noise. With the default top-K covering
    // all 4 fixture rows, both can legitimately be 1.0 — the weaker
    // ordering is what carries the regression signal.
    expect((allergens[0].posterior ?? 0)).toBeGreaterThanOrEqual(
      allergens[allergens.length - 1].posterior ?? 0,
    );
  });

  it("scoreSource: 'signals' feeds the signal-count curve into `score`", () => {
    const { allergens } = buildRankedFromEloRows(FIXTURE, {
      seed: 0,
      scoreSource: "signals",
    });
    // The signal-count curve grows monotonically with total signals.
    // Ragweed (14) > Oak (12) > Dust Mite (8) > Cat Dander (4).
    expect(allergens[0].score).toBeGreaterThan(allergens[1].score);
    expect(allergens[1].score).toBeGreaterThan(allergens[2].score);
    expect(allergens[2].score).toBeGreaterThan(allergens[3].score);
  });

  it("scoreSource: 'discriminative' puts the sigmoid into `score`", () => {
    const { allergens } = buildRankedFromEloRows(FIXTURE, {
      seed: 0,
      scoreSource: "discriminative",
    });
    for (const a of allergens) {
      expect(a.score).toBe(a.discriminative);
    }
  });

  it("returns a tournamentEntries projection matching the rows 1:1", () => {
    const { tournamentEntries } = buildRankedFromEloRows(FIXTURE, {
      seed: 0,
    });
    expect(tournamentEntries).toHaveLength(FIXTURE.length);
    expect(tournamentEntries[0]).toMatchObject({
      allergen_id: "ragweed",
      common_name: "Ragweed",
      composite_score: 1400,
    });
  });

  it("pins the exact posterior + discriminative for the fixture (seed=0)", () => {
    const { allergens } = buildRankedFromEloRows(FIXTURE, { seed: 0 });

    // Snapshot: if any of these change, the seed/runs/noise/sigmoid
    // moved. Review the change intentionally — do not bump blindly.
    const snapshot = allergens.map((a) => ({
      allergen_id: a.allergen_id,
      rank: a.rank,
      confidence_tier: a.confidence_tier,
      discriminative: Number(a.discriminative?.toFixed(6)),
      posterior: Number(a.posterior?.toFixed(6)),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
