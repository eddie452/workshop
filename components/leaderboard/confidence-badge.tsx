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
  { label: string; tailwind: string }
> = {
  low: {
    label: "Low",
    tailwind: "bg-brand-primary-light text-brand-primary-dark",
  },
  medium: {
    label: "Medium",
    tailwind: "bg-[#D6F0F8] text-[#0682BB]",
  },
  high: {
    label: "High",
    tailwind: "bg-[#0682BB] text-white",
  },
  very_high: {
    label: "Very High",
    tailwind: "bg-[#055A8C] text-white",
  },
};

export function ConfidenceBadge({ tier }: ConfidenceBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <span
      data-testid="confidence-badge"
      data-tier={tier}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.tailwind}`}
    >
      {config.label}
    </span>
  );
}
