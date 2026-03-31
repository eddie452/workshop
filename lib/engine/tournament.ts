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
/* Final Four + Trigger Champion                                       */
/* ------------------------------------------------------------------ */

/**
 * Run the full pairwise tournament: sort, extract Final Four and Trigger Champion.
 *
 * @param entries — tournament entries (will be sorted)
 * @returns TournamentResult with leaderboard, final_four, and trigger_champion
 */
export function runTournament(entries: TournamentEntry[]): TournamentResult {
  const leaderboard = pairwiseSort(entries);

  const final_four = leaderboard.slice(0, FINAL_FOUR_SIZE);
  const trigger_champion = leaderboard.length > 0 ? leaderboard[0] : null;

  return {
    leaderboard,
    final_four,
    trigger_champion,
  };
}
