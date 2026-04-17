/**
 * Ranked leaderboard builder — shared helper (issue #200).
 *
 * Centralizes the two-layer confidence mapping that was previously
 * duplicated across `app/(app)/dashboard/page.tsx` and
 * `app/api/leaderboard/route.ts` (see issue #193 for the two-layer
 * model). Keeping one implementation means the next seed / runs /
 * noise tweak — or subtle bug fix — lands in both call sites by
 * construction, so the bracket and the ranked list cannot drift.
 *
 * Server-side only: imports from `@/lib/engine`, which must never
 * be bundled into client components (API keys would leak).
 *
 * Behavior contract (pinned by `ranked-leaderboard.test.ts`):
 *   - Input `rows` must already be ordered by Elo descending.
 *     `rank` is assigned as `index + 1`.
 *   - `posterior` drives `confidence_tier`; falls back to the
 *     signal-count tier if the posterior is non-finite.
 *   - `score` is selectable via `options.scoreSource`:
 *       "signals"       — legacy signal-count curve
 *                         (`getConfidenceScoreBySignals`)
 *       "discriminative" — Elo-separation sigmoid
 *     Each existing caller keeps its current `score` source.
 *   - Posterior seed / runs / noise come from
 *     `getPosteriorConfidence` defaults; override via `options`.
 */

import {
  getConfidenceScoreBySignals,
  getDiscriminativeConfidence,
  getPosteriorConfidence,
  getConfidenceTierByPosterior,
} from "./confidence-score";
import { getConfidenceTierBySignals } from "./confidence";
import type { TournamentEntry } from "./types";
import type { RankedAllergen } from "@/components/leaderboard/types";
import type { AllergenCategory } from "@/lib/supabase/types";
import type { PosteriorConfidenceOptions } from "./confidence-score";

export interface EloRowForRanking {
  allergen_id: string;
  elo_score: number;
  positive_signals: number;
  negative_signals: number;
  common_name: string;
  category: string;
}

export interface BuildRankedOptions extends PosteriorConfidenceOptions {
  /**
   * Which layer feeds the back-compat `score` field on the output.
   *   - "signals"       (default): legacy signal-count curve. Matches
   *                     the dashboard page's historical behavior.
   *   - "discriminative": Elo-separation sigmoid. Matches the
   *                     leaderboard API's behavior (fixes the 21%
   *                     flat-line bug — see route comments).
   *
   * Both call sites pass their current choice explicitly so this
   * refactor produces byte-identical posterior output.
   */
  scoreSource?: "signals" | "discriminative";
}

/**
 * Build the ranked leaderboard payload (ordering + two-layer
 * confidence) from Elo rows already sorted by score descending.
 *
 * Also returns the `tournamentEntries` projection used by downstream
 * engine calls (e.g. `buildBracketTrace`), so the dashboard doesn't
 * have to recompute it.
 */
export function buildRankedFromEloRows(
  rows: readonly EloRowForRanking[],
  options: BuildRankedOptions = {},
): {
  allergens: RankedAllergen[];
  tournamentEntries: TournamentEntry[];
} {
  const scoreSource = options.scoreSource ?? "signals";

  const elos = rows.map((row) => row.elo_score);
  const tournamentEntries: TournamentEntry[] = rows.map((row) => ({
    allergen_id: row.allergen_id,
    common_name: row.common_name,
    category: row.category,
    composite_score: row.elo_score,
    // Placeholder — the posterior run does not read `tier`.
    tier: "low" as const,
  }));
  const posteriors = getPosteriorConfidence(tournamentEntries, options);

  const allergens: RankedAllergen[] = rows.map((row, index) => {
    const totalSignals = row.positive_signals + row.negative_signals;
    const discriminative = getDiscriminativeConfidence(row.elo_score, elos);
    const posterior = posteriors[row.allergen_id] ?? 0;

    const score =
      scoreSource === "discriminative"
        ? discriminative
        : getConfidenceScoreBySignals(totalSignals);

    return {
      allergen_id: row.allergen_id,
      common_name: row.common_name,
      category: row.category as AllergenCategory,
      elo_score: row.elo_score,
      confidence_tier: Number.isFinite(posterior)
        ? getConfidenceTierByPosterior(posterior)
        : getConfidenceTierBySignals(totalSignals),
      score,
      discriminative,
      posterior,
      rank: index + 1,
    };
  });

  return { allergens, tournamentEntries };
}
