/**
 * Trigger Champion Card
 *
 * Prominently displays the #1 ranked allergen — the user's
 * "Trigger Champion". This is always visible, even on free tier.
 */

import type { TriggerChampionCardProps } from "./types";
import { ConfidenceBadge } from "./confidence-badge";
import { CategoryIcon } from "./category-icon";

export function TriggerChampionCard({ allergen }: TriggerChampionCardProps) {
  return (
    <div
      data-testid="trigger-champion-card"
      className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg"
      style={{
        borderRadius: "0.75rem",
        border: "2px solid #fbbf24",
        background: "linear-gradient(to bottom right, #fffbeb, #fff7ed)",
        padding: "1.5rem",
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)",
      }}
    >
      {/* Crown / header */}
      <div
        className="mb-3 flex items-center gap-2"
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          className="text-2xl"
          style={{ fontSize: "1.5rem" }}
          aria-hidden="true"
        >
          &#x1F451;
        </span>
        <h2
          className="text-sm font-bold uppercase tracking-wider text-amber-700"
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#b45309",
            margin: 0,
          }}
        >
          Trigger Champion
        </h2>
      </div>

      {/* Allergen name + category */}
      <div
        className="mb-3 flex items-center gap-3"
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <CategoryIcon category={allergen.category} />
        <h3
          data-testid="champion-name"
          className="text-2xl font-bold text-gray-900"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          {allergen.common_name}
        </h3>
      </div>

      {/* Elo score + confidence */}
      <div
        className="flex items-center gap-3"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span
          data-testid="champion-elo"
          className="text-lg font-semibold text-gray-700"
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          Elo {allergen.elo_score}
        </span>
        <ConfidenceBadge tier={allergen.confidence_tier} />
      </div>
    </div>
  );
}
