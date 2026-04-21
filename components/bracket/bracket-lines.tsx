/**
 * BracketConnector — CSS-based connecting lines between bracket rounds
 * (tickets #180, #238)
 *
 * Renders between two adjacent round columns in the bracket flex layout.
 * For each pair of feeder matches (2K, 2K+1) in round N, draws an
 * elbow connector that merges into the corresponding match K in round N+1.
 *
 * Alignment strategy (ticket #238):
 *   - Connector column is a sibling of the source node stack inside a
 *     flex-row wrapper. `items-stretch` makes the connector's height
 *     equal to the node stack's height, so we can drive elbow heights
 *     by flex-basis rather than fixed pixel values.
 *   - Each pair wrapper is `flex-1` and its two elbow halves are each
 *     `flex-1`. The connector mirrors the source column's `gap-3`
 *     spacing, so pair boundaries line up with the gap between source
 *     match pairs and each half's midpoint sits at the vertical center
 *     of its feeder match.
 *
 * All strokes use champ-blue via border color tokens. No raw hex.
 *
 * Animation sync (ticket #238):
 *   The connector fades in after the node slide-in animation resolves.
 *   See `.bracket-connector-enter` in `app/globals.css`. `animationDelay`
 *   is passed from `bracket.tsx` so each connector column lines up with
 *   its paired round's staggered reveal.
 */

export interface BracketConnectorProps {
  /** Number of matches in the source (left) round. */
  sourceMatchCount: number;
  /**
   * Delay (ms) before the connector fades in. Should equal the source
   * round's final node delay + node animation duration so connectors
   * appear after the slide-in settles.
   */
  animationDelayMs?: number;
}

/**
 * A single connector column placed between two adjacent bracket rounds.
 *
 * The source round has `sourceMatchCount` matches; the target round has
 * `sourceMatchCount / 2` matches. Each pair of source matches merges
 * into one target match.
 */
export function BracketConnector({
  sourceMatchCount,
  animationDelayMs = 0,
}: BracketConnectorProps) {
  const pairCount = Math.floor(sourceMatchCount / 2);

  if (pairCount === 0) return null;

  return (
    <div
      data-testid="bracket-connector"
      // `gap-3` mirrors the source node stack's `gap-3` so pair
      // boundaries line up with the gap between source pairs.
      // `self-stretch` + `flex-1` pair wrappers let each elbow scale
      // with variable node heights instead of a fixed `h-8`.
      className="bracket-connector-enter flex flex-col gap-3 self-stretch"
      style={{ animationDelay: `${animationDelayMs}ms` }}
      aria-hidden="true"
    >
      {Array.from({ length: pairCount }, (_, pairIdx) => (
        <div
          key={pairIdx}
          data-testid={`bracket-connector-pair-${pairIdx}`}
          className="flex flex-1 flex-col"
        >
          {/* Top half — upper feeder match elbow. `flex-1` spans the
              top feeder's full height so the corner sits at its vertical
              center regardless of node content. */}
          <div className="w-6 flex-1 border-r-2 border-t-2 border-champ-blue rounded-tr-lg" />
          {/* Bottom half — lower feeder match elbow. */}
          <div className="w-6 flex-1 border-r-2 border-b-2 border-champ-blue rounded-br-lg" />
        </div>
      ))}
    </div>
  );
}
