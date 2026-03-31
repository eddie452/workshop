import { describe, it, expect } from "vitest";
import {
  createTournamentEntry,
  pairwiseCompare,
  pairwiseSort,
  runTournament,
} from "@/lib/engine/tournament";
import type { TournamentEntry } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

const makeEntry = (
  overrides: Partial<TournamentEntry> = {},
): TournamentEntry => ({
  allergen_id: "oak",
  common_name: "Oak",
  category: "tree",
  composite_score: 1000,
  tier: "medium",
  ...overrides,
});

/* ------------------------------------------------------------------ */
/* createTournamentEntry                                               */
/* ------------------------------------------------------------------ */

describe("createTournamentEntry", () => {
  it("creates entry with correct fields", () => {
    const entry = createTournamentEntry("oak", "Oak", "tree", 1500);
    expect(entry.allergen_id).toBe("oak");
    expect(entry.common_name).toBe("Oak");
    expect(entry.category).toBe("tree");
    expect(entry.composite_score).toBe(1500);
    expect(entry.tier).toBe("very_high");
  });

  it("rounds composite score to integer", () => {
    const entry = createTournamentEntry("oak", "Oak", "tree", 1234.567);
    expect(entry.composite_score).toBe(1235);
  });

  it("maps to correct confidence tier", () => {
    expect(createTournamentEntry("a", "A", "tree", 1500).tier).toBe("very_high");
    expect(createTournamentEntry("a", "A", "tree", 1300).tier).toBe("high");
    expect(createTournamentEntry("a", "A", "tree", 1000).tier).toBe("medium");
    expect(createTournamentEntry("a", "A", "tree", 500).tier).toBe("low");
  });
});

/* ------------------------------------------------------------------ */
/* pairwiseCompare                                                     */
/* ------------------------------------------------------------------ */

describe("pairwiseCompare", () => {
  it("ranks higher score first", () => {
    const a = makeEntry({ composite_score: 1500 });
    const b = makeEntry({ composite_score: 1200 });
    expect(pairwiseCompare(a, b)).toBeLessThan(0);
  });

  it("ranks lower score second", () => {
    const a = makeEntry({ composite_score: 800 });
    const b = makeEntry({ composite_score: 1200 });
    expect(pairwiseCompare(a, b)).toBeGreaterThan(0);
  });

  it("breaks ties by allergen_id lexicographically", () => {
    const a = makeEntry({ allergen_id: "birch", composite_score: 1000 });
    const b = makeEntry({ allergen_id: "oak", composite_score: 1000 });
    // "birch" < "oak" → a should rank first
    expect(pairwiseCompare(a, b)).toBeLessThan(0);
  });

  it("returns 0 for identical entries", () => {
    const a = makeEntry({ allergen_id: "oak", composite_score: 1000 });
    const b = makeEntry({ allergen_id: "oak", composite_score: 1000 });
    expect(pairwiseCompare(a, b)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* pairwiseSort                                                        */
/* ------------------------------------------------------------------ */

describe("pairwiseSort", () => {
  it("sorts by composite score descending", () => {
    const entries = [
      makeEntry({ allergen_id: "low", composite_score: 500 }),
      makeEntry({ allergen_id: "high", composite_score: 1500 }),
      makeEntry({ allergen_id: "mid", composite_score: 1000 }),
    ];
    const sorted = pairwiseSort(entries);
    expect(sorted[0].allergen_id).toBe("high");
    expect(sorted[1].allergen_id).toBe("mid");
    expect(sorted[2].allergen_id).toBe("low");
  });

  it("produces deterministic results for identical scores", () => {
    const entries = [
      makeEntry({ allergen_id: "cedar", composite_score: 1000 }),
      makeEntry({ allergen_id: "birch", composite_score: 1000 }),
      makeEntry({ allergen_id: "alder", composite_score: 1000 }),
    ];
    const sorted = pairwiseSort(entries);
    // Lexicographic order: alder, birch, cedar
    expect(sorted[0].allergen_id).toBe("alder");
    expect(sorted[1].allergen_id).toBe("birch");
    expect(sorted[2].allergen_id).toBe("cedar");
  });

  it("does not mutate original array", () => {
    const entries = [
      makeEntry({ allergen_id: "b", composite_score: 500 }),
      makeEntry({ allergen_id: "a", composite_score: 1500 }),
    ];
    const original = [...entries];
    pairwiseSort(entries);
    expect(entries[0].allergen_id).toBe(original[0].allergen_id);
    expect(entries[1].allergen_id).toBe(original[1].allergen_id);
  });

  it("handles empty array", () => {
    expect(pairwiseSort([])).toHaveLength(0);
  });

  it("handles single element", () => {
    const entries = [makeEntry({ allergen_id: "oak" })];
    const sorted = pairwiseSort(entries);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].allergen_id).toBe("oak");
  });
});

/* ------------------------------------------------------------------ */
/* runTournament                                                       */
/* ------------------------------------------------------------------ */

describe("runTournament", () => {
  it("produces correct Final Four from known Elo values", () => {
    const entries = [
      makeEntry({ allergen_id: "e", composite_score: 500 }),
      makeEntry({ allergen_id: "d", composite_score: 800 }),
      makeEntry({ allergen_id: "c", composite_score: 1100 }),
      makeEntry({ allergen_id: "b", composite_score: 1300 }),
      makeEntry({ allergen_id: "a", composite_score: 1600 }),
    ];
    const result = runTournament(entries);

    // Leaderboard sorted descending
    expect(result.leaderboard).toHaveLength(5);
    expect(result.leaderboard[0].allergen_id).toBe("a");
    expect(result.leaderboard[4].allergen_id).toBe("e");

    // Final Four = top 4
    expect(result.final_four).toHaveLength(4);
    expect(result.final_four.map((e) => e.allergen_id)).toEqual([
      "a", "b", "c", "d",
    ]);

    // Trigger Champion = top 1
    expect(result.trigger_champion?.allergen_id).toBe("a");
  });

  it("handles fewer than 4 allergens", () => {
    const entries = [
      makeEntry({ allergen_id: "b", composite_score: 1000 }),
      makeEntry({ allergen_id: "a", composite_score: 1500 }),
    ];
    const result = runTournament(entries);

    expect(result.leaderboard).toHaveLength(2);
    expect(result.final_four).toHaveLength(2);
    expect(result.trigger_champion?.allergen_id).toBe("a");
  });

  it("returns null trigger champion for empty input", () => {
    const result = runTournament([]);
    expect(result.leaderboard).toHaveLength(0);
    expect(result.final_four).toHaveLength(0);
    expect(result.trigger_champion).toBeNull();
  });

  it("includes confidence tiers in results", () => {
    const entries = [
      makeEntry({ allergen_id: "high", composite_score: 1500, tier: "very_high" }),
      makeEntry({ allergen_id: "low", composite_score: 500, tier: "low" }),
    ];
    const result = runTournament(entries);
    expect(result.leaderboard[0].tier).toBe("very_high");
    expect(result.leaderboard[1].tier).toBe("low");
  });
});
