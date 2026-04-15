import { describe, it, expect } from "vitest";
import {
  buildBracketTrace,
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

/* ------------------------------------------------------------------ */
/* bracket_trace                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build N tournament entries with distinct, strictly-decreasing scores
 * so that the top seed always wins and ordering is unambiguous.
 */
const makeEntries = (n: number): TournamentEntry[] =>
  Array.from({ length: n }, (_, i) =>
    makeEntry({
      allergen_id: `a${String(i).padStart(3, "0")}`,
      common_name: `Allergen ${i}`,
      composite_score: 2000 - i * 10,
    }),
  );

describe("bracket_trace", () => {
  it("emits exactly 7 matches for an 8-entry tournament (8→4→2→1)", () => {
    const result = runTournament(makeEntries(8));
    expect(result.bracket_trace).toHaveLength(7);

    // 4 first-round, 2 semifinal, 1 final
    const byRound = result.bracket_trace.reduce<Record<number, number>>(
      (acc, m) => {
        acc[m.round] = (acc[m.round] ?? 0) + 1;
        return acc;
      },
      {},
    );
    expect(byRound[0]).toBe(4);
    expect(byRound[1]).toBe(2);
    expect(byRound[2]).toBe(1);
  });

  it("emits exactly 15 matches for a 16-entry tournament", () => {
    const result = runTournament(makeEntries(16));
    expect(result.bracket_trace).toHaveLength(15);

    const rounds = new Set(result.bracket_trace.map((m) => m.round));
    expect(rounds.size).toBe(4); // 16→8→4→2→1 = 4 rounds
  });

  it("emits exactly 31 matches for a 32-entry tournament", () => {
    const result = runTournament(makeEntries(32));
    expect(result.bracket_trace).toHaveLength(31);

    const rounds = new Set(result.bracket_trace.map((m) => m.round));
    expect(rounds.size).toBe(5); // 32→16→8→4→2→1 = 5 rounds
  });

  it("final-round winnerId matches trigger_champion.allergen_id", () => {
    for (const n of [8, 16, 32]) {
      const result = runTournament(makeEntries(n));
      const finalRound = Math.max(
        ...result.bracket_trace.map((m) => m.round),
      );
      const finalMatches = result.bracket_trace.filter(
        (m) => m.round === finalRound,
      );
      expect(finalMatches).toHaveLength(1);
      expect(finalMatches[0].winnerId).toBe(
        result.trigger_champion?.allergen_id,
      );
    }
  });

  it("produces a byte-identical trace across repeated runs (determinism)", () => {
    const entries = makeEntries(16);
    const a = runTournament(entries).bracket_trace;
    const b = runTournament([...entries].reverse()).bracket_trace;
    // Same input (set-wise) and same comparator => identical trace
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is ordered by (round asc, matchId asc)", () => {
    const trace = runTournament(makeEntries(16)).bracket_trace;
    for (let i = 1; i < trace.length; i++) {
      const prev = trace[i - 1];
      const curr = trace[i];
      const prevKey = prev.round * 10_000 + prev.matchId;
      const currKey = curr.round * 10_000 + curr.matchId;
      expect(currKey).toBeGreaterThan(prevKey);
    }
  });

  it("records left/right scores and a winnerId equal to left or right", () => {
    const trace = runTournament(makeEntries(8)).bracket_trace;
    for (const m of trace) {
      expect(typeof m.leftScore).toBe("number");
      expect(typeof m.rightScore).toBe("number");
      expect([m.leftAllergenId, m.rightAllergenId]).toContain(m.winnerId);
    }
  });

  it("returns empty bracket_trace for 0 and 1 entries", () => {
    expect(runTournament([]).bracket_trace).toEqual([]);
    expect(
      runTournament([makeEntry({ allergen_id: "only" })]).bracket_trace,
    ).toEqual([]);
  });

  it("does not change leaderboard/final_four/trigger_champion shape", () => {
    // Regression guard: adding bracket_trace must not perturb legacy fields.
    const entries = makeEntries(8);
    const result = runTournament(entries);
    const sortedIds = [...entries]
      .sort(pairwiseCompare)
      .map((e) => e.allergen_id);
    expect(result.leaderboard.map((e) => e.allergen_id)).toEqual(sortedIds);
    expect(result.final_four.map((e) => e.allergen_id)).toEqual(
      sortedIds.slice(0, 4),
    );
    expect(result.trigger_champion?.allergen_id).toBe(sortedIds[0]);
  });

  it("buildBracketTrace is callable directly and matches runTournament output", () => {
    const entries = makeEntries(16);
    const sorted = pairwiseSort(entries);
    const direct = buildBracketTrace(sorted);
    const viaRun = runTournament(entries).bracket_trace;
    expect(direct).toEqual(viaRun);
  });

  it("handles non-power-of-two entry counts by awarding byes to top seeds", () => {
    // 6 entries: bracket size 4, 2 byes → 6-1=5 head-to-head matches total.
    const result = runTournament(makeEntries(6));
    expect(result.bracket_trace).toHaveLength(5);
    // Top seed still wins because scores are strictly decreasing.
    const finalRound = Math.max(
      ...result.bracket_trace.map((m) => m.round),
    );
    const finalMatch = result.bracket_trace.find(
      (m) => m.round === finalRound,
    );
    expect(finalMatch?.winnerId).toBe(result.trigger_champion?.allergen_id);
  });
});
