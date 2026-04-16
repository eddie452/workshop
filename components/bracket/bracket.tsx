/**
 * Bracket — grid container (ticket #179)
 *
 * Renders a single-elimination bracket as a horizontal grid of columns,
 * one column per round (round 0 leftmost, Final rightmost). Each column
 * shows a round label above the match cards.
 *
 * This is the bracket UI shell only:
 *   - No connecting lines between matches (ticket #179-B)
 *   - No animations / mobile-scroll polish (ticket #179-C)
 *
 * Confidence UI pattern (Modexa):
 *   - Champion card uses "Most likely trigger" hedging — not a flat %
 *   - Low-posterior (< 0.5) champion renders a "keep tracking" affordance
 */

import type { BracketMatch } from "@/lib/engine/types";
import type { RankedAllergen } from "@/components/leaderboard/types";
import { FDA_DISCLAIMER_LABEL } from "@/components/shared/fda-disclaimer";
import { BracketNode } from "./bracket-node";
import { BracketConnector } from "./bracket-lines";
import {
  buildBracketVMs,
  roundLabel,
  type BracketNodeVM,
} from "./types";

export interface BracketProps {
  /** Raw trace from the tournament engine. */
  nodes: readonly BracketMatch[];
  /** Ranked leaderboard providing thumbnails + per-allergen confidence. */
  ranked: readonly RankedAllergen[];
  /** Whether to render connecting lines between rounds. Defaults to true. */
  showLines?: boolean;
}

/** Group VMs by round, preserving per-round matchId order. */
function groupByRound(vms: BracketNodeVM[]): BracketNodeVM[][] {
  if (vms.length === 0) return [];
  let maxRound = 0;
  for (const vm of vms) if (vm.round > maxRound) maxRound = vm.round;
  const columns: BracketNodeVM[][] = [];
  for (let r = 0; r <= maxRound; r++) columns.push([]);
  for (const vm of vms) columns[vm.round].push(vm);
  // Sort each column by matchId (the trace is already ordered, but be defensive)
  for (const col of columns) col.sort((a, b) => a.matchId - b.matchId);
  return columns;
}

export function Bracket({ nodes, ranked, showLines = true }: BracketProps) {
  const vms = buildBracketVMs(nodes, ranked);

  if (vms.length === 0) {
    return (
      <section
        data-testid="bracket-empty"
        aria-label="Tournament bracket"
        className="rounded-card border border-brand-border bg-brand-surface-muted p-6"
      >
        <p className="text-sm text-brand-text-secondary">
          No matches yet — check in with your symptoms to run a tournament.
        </p>
      </section>
    );
  }

  const columns = groupByRound(vms);
  const totalRounds = columns.length;

  // The champion is the winner of the final (last) round's single match.
  const finalColumn = columns[columns.length - 1];
  const finalMatch = finalColumn[0];
  const championSide =
    finalMatch.winnerSide === "left" ? finalMatch.left : finalMatch.right;
  const championPosterior = championSide.posterior;
  const isLowConfidence = championPosterior < 0.5;

  return (
    <section
      data-testid="bracket"
      aria-label="Tournament bracket"
      className="rounded-card border border-brand-border bg-brand-surface p-4 shadow-sm"
    >
      <header className="mb-4">
        <h2 className="text-lg font-bold text-brand-primary-dark">
          Tournament Bracket
        </h2>
        <p className="mt-1 text-xs text-brand-text-secondary">
          Head-to-head matchups that produced your most likely trigger.
        </p>
      </header>

      {isLowConfidence && (
        <p
          data-testid="bracket-low-confidence"
          className="mb-4 rounded-card border border-brand-border bg-brand-primary-light px-3 py-2 text-xs font-medium text-brand-primary-dark"
        >
          Low confidence — keep tracking your symptoms to sharpen these
          results.
        </p>
      )}

      <div
        data-testid="bracket-grid"
        className="flex gap-4 overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${totalRounds}, minmax(0, 1fr))` }}
      >
        {columns.map((column, roundIdx) => {
          const isFinal = roundIdx === totalRounds - 1;
          return (
            <div key={`round-group-${roundIdx}`} className="flex">
              <div
                data-testid={`bracket-column-${roundIdx}`}
                data-round={roundIdx}
                className="flex min-w-[240px] flex-1 flex-col gap-3"
              >
                <h3
                  data-testid={`bracket-round-label-${roundIdx}`}
                  className="text-xs font-semibold uppercase tracking-wider text-brand-text-accent"
                >
                  {roundLabel(roundIdx, totalRounds)}
                </h3>
                <div className="flex flex-col justify-around gap-3">
                  {column.map((vm) => (
                    <BracketNode
                      key={`${vm.round}-${vm.matchId}`}
                      node={vm}
                      isFinal={isFinal}
                    />
                  ))}
                </div>
              </div>
              {showLines && !isFinal && (
                <BracketConnector sourceMatchCount={column.length} />
              )}
            </div>
          );
        })}
      </div>

      <footer className="mt-4 border-t border-brand-border-light pt-3">
        <p
          data-testid="bracket-fda-disclaimer"
          className="text-xs font-medium text-brand-primary-dark"
        >
          {FDA_DISCLAIMER_LABEL}
        </p>
      </footer>
    </section>
  );
}
