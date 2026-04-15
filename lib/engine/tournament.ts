/**
 * Pairwise Tournament Sort
 *
 * Sorts allergens by composite Elo score into a ranked leaderboard,
 * then extracts the Final Four (top 4) and Trigger Champion (top 1).
 *
 * The sort is deterministic: when two allergens have identical composite
 * scores, ties are broken by allergen_id (lexicographic) to ensure
 * reproducible rankings.
 *
 * Server-side only — never import from client components.
 */

import type {
  BracketMatch,
  ConfidenceTier,
  TournamentEntry,
  TournamentResult,
} from "./types";
import { getConfidenceTier } from "./confidence";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Number of allergens in the Final Four */
const FINAL_FOUR_SIZE = 4;

/* ------------------------------------------------------------------ */
/* Tournament entry creation                                           */
/* ------------------------------------------------------------------ */

/**
 * Create a tournament entry from an allergen's computed data.
 *
 * @param allergenId — allergen identifier
 * @param commonName — human-readable name
 * @param category — allergen category
 * @param compositeScore — final score after all multipliers
 * @returns TournamentEntry with confidence tier
 */
export function createTournamentEntry(
  allergenId: string,
  commonName: string,
  category: string,
  compositeScore: number,
): TournamentEntry {
  return {
    allergen_id: allergenId,
    common_name: commonName,
    category,
    composite_score: Math.round(compositeScore),
    tier: getConfidenceTier(compositeScore),
  };
}

/* ------------------------------------------------------------------ */
/* Pairwise sort                                                       */
/* ------------------------------------------------------------------ */

/**
 * Pairwise comparison function for tournament sorting.
 * Sorts descending by composite score with deterministic tie-breaking.
 *
 * @param a — first entry
 * @param b — second entry
 * @returns negative if a ranks higher, positive if b ranks higher
 */
export function pairwiseCompare(
  a: TournamentEntry,
  b: TournamentEntry,
): number {
  // Primary: higher score ranks first (descending)
  const scoreDiff = b.composite_score - a.composite_score;
  if (scoreDiff !== 0) return scoreDiff;

  // Tie-break: lexicographic by allergen_id (ascending, deterministic)
  return a.allergen_id.localeCompare(b.allergen_id);
}

/**
 * Sort tournament entries using pairwise comparison.
 * Returns a new array (does not mutate input).
 *
 * @param entries — unsorted tournament entries
 * @returns sorted array (highest score first)
 */
export function pairwiseSort(entries: TournamentEntry[]): TournamentEntry[] {
  return [...entries].sort(pairwiseCompare);
}

/* ------------------------------------------------------------------ */
/* Bracket trace                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build a round-by-round bracket trace from a sorted leaderboard.
 *
 * The bracket is a single-elimination tournament seeded directly from
 * the leaderboard: highest seed meets lowest seed, etc. Winners are
 * determined by {@link pairwiseCompare}, which is the same comparator
 * used by {@link pairwiseSort} — so the trace is consistent with the
 * leaderboard and fully deterministic under the same input.
 *
 * For a power-of-two count N, this emits exactly N - 1 matches
 * (8 → 7, 16 → 15, 32 → 31). For non-power-of-two counts, the top
 * seeds receive first-round byes so the round-one field is reduced to
 * the next lower power of two; byes are *not* recorded as matches —
 * only real head-to-heads are. Zero- and one-entry inputs yield an
 * empty trace.
 *
 * Pure and deterministic — no I/O, no randomness.
 *
 * @param sorted — entries already sorted by {@link pairwiseSort}
 * @returns bracket trace ordered by (round asc, matchId asc)
 */
export function buildBracketTrace(
  sorted: readonly TournamentEntry[],
): BracketMatch[] {
  const trace: BracketMatch[] = [];
  if (sorted.length < 2) return trace;

  // Largest power of two that is <= sorted.length.
  // Everything above it gets a first-round bye.
  let bracketSize = 1;
  while (bracketSize * 2 <= sorted.length) bracketSize *= 2;

  const byeCount = sorted.length - bracketSize;
  // Top `byeCount` seeds get byes; remaining seeds form round 0.
  const byes: TournamentEntry[] = sorted.slice(0, byeCount);
  const roundZeroField: TournamentEntry[] = sorted.slice(byeCount);

  // Round 0: pair seeds 1-vs-N, 2-vs-(N-1), ...
  let currentRound: TournamentEntry[] = [];
  const fieldSize = roundZeroField.length;
  if (fieldSize >= 2) {
    for (let i = 0; i < fieldSize / 2; i++) {
      const left = roundZeroField[i];
      const right = roundZeroField[fieldSize - 1 - i];
      const winner = pairwiseCompare(left, right) <= 0 ? left : right;
      trace.push({
        round: 0,
        matchId: i,
        leftAllergenId: left.allergen_id,
        rightAllergenId: right.allergen_id,
        winnerId: winner.allergen_id,
        leftScore: left.composite_score,
        rightScore: right.composite_score,
      });
      currentRound.push(winner);
    }
  } else {
    currentRound = [...roundZeroField];
  }

  // Reinsert byes at the top of the field for subsequent rounds,
  // preserving seed order (top seed plays lowest surviving seed).
  currentRound = [...byes, ...currentRound];

  // Subsequent rounds: top vs bottom of survivors list each round.
  let roundIndex = 1;
  while (currentRound.length > 1) {
    const nextRound: TournamentEntry[] = [];
    const size = currentRound.length;
    for (let i = 0; i < size / 2; i++) {
      const left = currentRound[i];
      const right = currentRound[size - 1 - i];
      const winner = pairwiseCompare(left, right) <= 0 ? left : right;
      trace.push({
        round: roundIndex,
        matchId: i,
        leftAllergenId: left.allergen_id,
        rightAllergenId: right.allergen_id,
        winnerId: winner.allergen_id,
        leftScore: left.composite_score,
        rightScore: right.composite_score,
      });
      nextRound.push(winner);
    }
    currentRound = nextRound;
    roundIndex++;
  }

  return trace;
}

/* ------------------------------------------------------------------ */
/* Final Four + Trigger Champion                                       */
/* ------------------------------------------------------------------ */

/**
 * Run the full pairwise tournament: sort, extract Final Four and Trigger Champion.
 *
 * @param entries — tournament entries (will be sorted)
 * @returns TournamentResult with leaderboard, final_four, trigger_champion,
 *          and a bracket_trace of every head-to-head match played
 */
export function runTournament(entries: TournamentEntry[]): TournamentResult {
  const leaderboard = pairwiseSort(entries);

  const final_four = leaderboard.slice(0, FINAL_FOUR_SIZE);
  const trigger_champion = leaderboard.length > 0 ? leaderboard[0] : null;
  const bracket_trace = buildBracketTrace(leaderboard);

  return {
    leaderboard,
    final_four,
    trigger_champion,
    bracket_trace,
  };
}
