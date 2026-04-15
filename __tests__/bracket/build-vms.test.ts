/**
 * buildBracketVMs — unit tests (ticket #179)
 *
 * Covers the pure join helper that merges a raw `BracketMatch[]`
 * trace with a ranked leaderboard into the VM shape the UI consumes.
 */

import { describe, it, expect } from "vitest";
import { buildBracketVMs } from "@/components/bracket/types";
import { buildBracketTrace } from "@/lib/engine/tournament";
import type { TournamentEntry, BracketMatch } from "@/lib/engine/types";
import type { RankedAllergen } from "@/components/leaderboard/types";

/** Helper: make N entries with strictly descending composite scores. */
function makeEntries(n: number): TournamentEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    allergen_id: `a-${i + 1}`,
    common_name: `Allergen ${i + 1}`,
    category: "pollen",
    composite_score: 1000 - i * 10,
    tier: "low" as const,
  }));
}

/** Helper: build a ranked leaderboard matching the entries. */
function makeRanked(n: number): RankedAllergen[] {
  return Array.from({ length: n }, (_, i) => ({
    allergen_id: `a-${i + 1}`,
    common_name: `Allergen ${i + 1}`,
    category: "pollen" as RankedAllergen["category"],
    elo_score: 1000 - i * 10,
    confidence_tier: "medium",
    score: 0.6,
    discriminative: 0.5 + i * 0.01,
    posterior: 0.5 + i * 0.01,
    rank: i + 1,
  }));
}

describe("buildBracketVMs", () => {
  it("produces 7 matches across 3 rounds for an 8-entry bracket", () => {
    const entries = makeEntries(8);
    const trace = buildBracketTrace(entries);
    const ranked = makeRanked(8);
    const vms = buildBracketVMs(trace, ranked);

    expect(vms).toHaveLength(7);
    const rounds = new Set(vms.map((v) => v.round));
    expect(rounds.size).toBe(3); // 8 -> 4 -> 2 -> 1, so rounds 0, 1, 2
    expect(vms.filter((v) => v.round === 0)).toHaveLength(4);
    expect(vms.filter((v) => v.round === 1)).toHaveLength(2);
    expect(vms.filter((v) => v.round === 2)).toHaveLength(1);
  });

  it("produces 15 matches across 4 rounds for a 16-entry bracket", () => {
    const entries = makeEntries(16);
    const trace = buildBracketTrace(entries);
    const vms = buildBracketVMs(trace, makeRanked(16));

    expect(vms).toHaveLength(15);
    const rounds = new Set(vms.map((v) => v.round));
    expect(rounds.size).toBe(4);
  });

  it("correctly identifies winnerSide as 'left' or 'right'", () => {
    const trace: BracketMatch[] = [
      {
        round: 0,
        matchId: 0,
        leftAllergenId: "a-1",
        rightAllergenId: "a-2",
        winnerId: "a-1",
        leftScore: 1000,
        rightScore: 500,
      },
      {
        round: 0,
        matchId: 1,
        leftAllergenId: "a-3",
        rightAllergenId: "a-4",
        winnerId: "a-4",
        leftScore: 300,
        rightScore: 700,
      },
    ];
    const vms = buildBracketVMs(trace, makeRanked(4));

    expect(vms[0].winnerSide).toBe("left");
    expect(vms[1].winnerSide).toBe("right");
  });

  it("falls back to generic thumbnail + id as name for unknown allergen ids", () => {
    const trace: BracketMatch[] = [
      {
        round: 0,
        matchId: 0,
        leftAllergenId: "unknown-x",
        rightAllergenId: "unknown-y",
        winnerId: "unknown-x",
        leftScore: 100,
        rightScore: 50,
      },
    ];
    const vms = buildBracketVMs(trace, []);

    expect(vms[0].left.name).toBe("unknown-x");
    expect(vms[0].right.name).toBe("unknown-y");
    expect(vms[0].left.thumbnail.src).toBe("/allergens/generic-plant.svg");
    expect(vms[0].right.thumbnail.src).toBe("/allergens/generic-plant.svg");
    expect(vms[0].left.discriminative).toBe(0);
    expect(vms[0].left.posterior).toBe(0);
  });

  it("returns an empty array for an empty trace", () => {
    expect(buildBracketVMs([], makeRanked(4))).toEqual([]);
  });
});
