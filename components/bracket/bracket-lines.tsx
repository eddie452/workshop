/**
 * BracketConnector — CSS-based connecting lines between bracket rounds
 * (ticket #180)
 *
 * Renders between two adjacent round columns in the bracket flex layout.
 * For each pair of feeder matches (2K, 2K+1) in round N, draws an
 * elbow connector that merges into the corresponding match K in round N+1.
 *
 * Layout: three sub-columns per connector gap:
 *   1. Right stubs — short horizontal lines exiting each match in round N
 *   2. Vertical merge — a vertical bar spanning each feeder pair, with a
 *      midpoint horizontal stub entering the next round
 *   3. Left stubs — short horizontal lines entering each match in round N+1
 *
 * All strokes use brand-primary (Champ Blue) via border color tokens.
 * No raw hex, no black, no gray.
 */

export interface BracketConnectorProps {
  /** Number of matches in the source (left) round. */
  sourceMatchCount: number;
}

/**
 * A single connector column placed between two adjacent bracket rounds.
 *
 * The source round has `sourceMatchCount` matches; the target round has
 * `sourceMatchCount / 2` matches. Each pair of source matches merges
 * into one target match.
 */
export function BracketConnector({ sourceMatchCount }: BracketConnectorProps) {
  const pairCount = Math.floor(sourceMatchCount / 2);

  if (pairCount === 0) return null;

  return (
    <div
      data-testid="bracket-connector"
      className="flex flex-col justify-around"
      aria-hidden="true"
    >
      {Array.from({ length: pairCount }, (_, pairIdx) => (
        <div
          key={pairIdx}
          data-testid={`bracket-connector-pair-${pairIdx}`}
          className="flex flex-col"
        >
          {/* Top half — upper feeder match elbow */}
          <div className="h-8 w-6 border-r-2 border-t-2 border-brand-primary rounded-tr-lg" />
          {/* Bottom half — lower feeder match elbow */}
          <div className="h-8 w-6 border-r-2 border-b-2 border-brand-primary rounded-br-lg" />
        </div>
      ))}
    </div>
  );
}
