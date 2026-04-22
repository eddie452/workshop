/**
 * BracketNode — single match card (ticket #179)
 *
 * Renders a head-to-head matchup with thumbnails, names, and the
 * Modexa Confidence UI pattern (bar length = discriminative, color
 * intensity = posterior tier). Winner badge uses Nature Pop sparingly:
 * only when the winner is the bracket champion AND posterior ≥ 0.75.
 * All other winners get a muted Champ Blue badge.
 *
 * Strict design-system compliance — no black, no gray, no raw hex.
 */

import type { BracketNodeVM, BracketSideVM } from "./types";
import { getConfidenceTierByPosterior } from "@/lib/engine/confidence-score";
import type { ConfidenceTier } from "@/lib/engine/types";

export interface BracketNodeProps {
  node: BracketNodeVM;
  /**
   * Whether this node is the championship match (the final round's
   * sole match). Only used to decide whether the winner is eligible
   * for the Nature Pop "champion" badge.
   */
  isFinal?: boolean;
}

/**
 * Map a posterior-derived tier to a Champ Blue bar color token.
 * Nature Pop is reserved for the champion badge elsewhere.
 */
function barColorForTier(tier: ConfidenceTier): string {
  switch (tier) {
    case "very_high":
      return "bg-dusty-denim";
    case "high":
      return "bg-champ-blue";
    case "medium":
      return "bg-white";
    case "low":
    default:
      return "bg-champ-blue";
  }
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 100;
  return Math.round(value * 100);
}

interface SideProps {
  side: BracketSideVM;
  isWinner: boolean;
  isChampion: boolean;
  label: string;
}

function Side({ side, isWinner, isChampion, label }: SideProps) {
  const tier = getConfidenceTierByPosterior(side.posterior);
  const barWidth = clampPct(side.discriminative);
  const barColor = barColorForTier(tier);

  return (
    <div
      data-testid={`bracket-side-${label}`}
      data-winner={isWinner ? "true" : "false"}
      className={[
        "flex items-center gap-3 rounded-card border px-3 py-2",
        isWinner
          ? "border-champ-blue bg-white"
          : "border-white bg-white opacity-60",
      ].join(" ")}
    >
      {/* Thumbnail — plain <img> to avoid next/image domain config */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={side.thumbnail.src}
        alt={side.thumbnail.alt}
        width={40}
        height={40}
        className="h-10 w-10 flex-shrink-0 rounded-pill border border-white bg-white"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center">
          <span
            data-testid={`bracket-side-${label}-name`}
            className={[
              "min-w-0 truncate text-sm font-semibold text-dusty-denim",
              isWinner ? "" : "line-through",
            ].join(" ")}
          >
            {side.name}
          </span>
        </div>
        {isWinner && isChampion && (
          <span
            data-testid="bracket-champion-badge"
            className="mt-1 inline-flex items-center self-start rounded-pill bg-nature-pop px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-dusty-denim"
          >
            Most likely trigger
          </span>
        )}
        {isWinner && !isChampion && (
          <span
            data-testid="bracket-winner-badge"
            className="mt-1 inline-flex items-center self-start rounded-pill border border-champ-blue bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dusty-denim"
          >
            Advances
          </span>
        )}

        {/* Confidence bar — width encodes discriminative, color encodes tier.
            Intentionally NO raw percentage label as the primary signal. */}
        <div
          data-testid={`bracket-side-${label}-bar`}
          data-tier={tier}
          className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-white"
          role="presentation"
        >
          <div
            className={["h-full rounded-pill", barColor].join(" ")}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function BracketNode({ node, isFinal = false }: BracketNodeProps) {
  const { left, right, winnerSide } = node;
  const winner = winnerSide === "left" ? left : right;
  const championEligible = isFinal && winner.posterior >= 0.75;

  const accessibleName =
    `Match: ${left.name} vs ${right.name}, winner ${winner.name}`;

  return (
    <article
      data-testid="bracket-node"
      data-round={node.round}
      data-match={node.matchId}
      aria-label={accessibleName}
      className="flex flex-col gap-2 rounded-card border border-champ-blue bg-white p-2 shadow-sm"
    >
      <Side
        side={left}
        isWinner={winnerSide === "left"}
        isChampion={championEligible && winnerSide === "left"}
        label="left"
      />
      <Side
        side={right}
        isWinner={winnerSide === "right"}
        isChampion={championEligible && winnerSide === "right"}
        label="right"
      />
    </article>
  );
}
