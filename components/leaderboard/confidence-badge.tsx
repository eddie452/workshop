/**
 * Confidence Tier Badge
 *
 * Displays a color-coded badge indicating the confidence level
 * of an allergen's ranking (low / medium / high / very high).
 */

import type { ConfidenceTier } from "@/lib/engine/types";

interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
}

const TIER_CONFIG: Record<
  ConfidenceTier,
  { label: string; bgColor: string; textColor: string; tailwind: string }
> = {
  low: {
    label: "Low",
    bgColor: "#dbeafe",
    textColor: "#1e40af",
    tailwind: "bg-blue-100 text-blue-800",
  },
  medium: {
    label: "Medium",
    bgColor: "#fef9c3",
    textColor: "#854d0e",
    tailwind: "bg-yellow-100 text-yellow-800",
  },
  high: {
    label: "High",
    bgColor: "#fed7aa",
    textColor: "#9a3412",
    tailwind: "bg-orange-100 text-orange-800",
  },
  very_high: {
    label: "Very High",
    bgColor: "#fecaca",
    textColor: "#991b1b",
    tailwind: "bg-red-100 text-red-800",
  },
};

export function ConfidenceBadge({ tier }: ConfidenceBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <span
      data-testid="confidence-badge"
      data-tier={tier}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.tailwind}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "9999px",
        padding: "0.125rem 0.5rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      {config.label}
    </span>
  );
}
