/**
 * Bracket Component Types (ticket #179)
 *
 * Client-safe view-model types for the tournament bracket UI.
 * The raw `BracketMatch` / `BracketNode` shapes are re-exported from
 * the engine for convenience; the `*VM` types below join each match
 * with per-side display data (thumbnail + confidence) pulled from the
 * `RankedAllergen` leaderboard that already feeds the dashboard.
 */

import type { BracketMatch, BracketNode } from "@/lib/engine/types";
import type { RankedAllergen } from "@/components/leaderboard/types";
import {
  getAllergenThumbnail,
  type AllergenThumbnail,
} from "@/lib/allergens/thumbnails";

export type { BracketMatch, BracketNode };

/** One side (left or right) of a rendered bracket node. */
export interface BracketSideVM {
  allergenId: string;
  /** Common name for display; falls back to `allergenId` when unknown. */
  name: string;
  thumbnail: AllergenThumbnail;
  /** Discriminative confidence in [0, 1] — drives bar width. */
  discriminative: number;
  /** Posterior confidence in [0, 1] — drives color intensity / tier. */
  posterior: number;
}

/** A single match card, joined with display metadata. */
export interface BracketNodeVM {
  round: number;
  matchId: number;
  left: BracketSideVM;
  right: BracketSideVM;
  /** Which side advanced, derived from `winnerId`. */
  winnerSide: "left" | "right";
  leftScore: number;
  rightScore: number;
}

/**
 * Build a per-side view model from a raw allergen id by joining against
 * the ranked leaderboard. Unknown ids fall back to the generic plant
 * thumbnail, the raw id as a name, and zeroed confidences — this keeps
 * the component robust to drift between the bracket trace and the
 * leaderboard slice (shouldn't happen in practice, but we never crash).
 */
function buildSide(
  allergenId: string,
  byId: Map<string, RankedAllergen>,
): BracketSideVM {
  const ranked = byId.get(allergenId);
  return {
    allergenId,
    name: ranked?.common_name ?? allergenId,
    thumbnail: getAllergenThumbnail(allergenId),
    discriminative: ranked?.discriminative ?? 0,
    posterior: ranked?.posterior ?? 0,
  };
}

/**
 * Join a bracket trace (from the engine) with a ranked leaderboard
 * (from the API / server page) into the VM shape the bracket UI
 * consumes. Pure: no I/O, deterministic under the same inputs.
 *
 * Empty traces return an empty array. Matches missing a `winnerId`
 * from either side default `winnerSide` to `"left"` — the trace
 * generator guarantees this won't happen in practice, but defensive.
 */
export function buildBracketVMs(
  trace: readonly BracketMatch[],
  ranked: readonly RankedAllergen[],
): BracketNodeVM[] {
  const byId = new Map<string, RankedAllergen>();
  for (const r of ranked) byId.set(r.allergen_id, r);

  return trace.map((match): BracketNodeVM => {
    const left = buildSide(match.leftAllergenId, byId);
    const right = buildSide(match.rightAllergenId, byId);
    const winnerSide: "left" | "right" =
      match.winnerId === match.rightAllergenId ? "right" : "left";
    return {
      round: match.round,
      matchId: match.matchId,
      left,
      right,
      winnerSide,
      leftScore: match.leftScore,
      rightScore: match.rightScore,
    };
  });
}

/**
 * Human-readable label for a round given the total number of rounds
 * in the bracket. Round 0 is the leftmost column (first matches); the
 * final round is always labelled "Final".
 */
export function roundLabel(roundIndex: number, totalRounds: number): string {
  // Number of matches in this round = 2^(totalRounds - 1 - roundIndex)
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd <= 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  const size = 2 ** (fromEnd + 1);
  return `Round of ${size}`;
}
