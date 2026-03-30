"use client";

/**
 * Dashboard Leaderboard Wrapper
 *
 * Client component that receives server-fetched data and renders
 * the Leaderboard component. This separation keeps data fetching
 * in the server component while allowing client interactivity
 * (FDA disclaimer acknowledgment, etc.).
 */

import { Leaderboard } from "@/components/leaderboard";
import type { RankedAllergen } from "@/components/leaderboard/types";
import type { ConfidenceTier } from "@/lib/engine/types";

/** Shape of an Elo row from the server component's Supabase query */
interface EloRow {
  allergen_id: string;
  elo_score: number;
  positive_signals: number;
  negative_signals: number;
  allergens: {
    common_name: string;
    category: string;
  };
}

interface DashboardLeaderboardProps {
  eloRows: EloRow[];
  isPremium: boolean;
  isEnvironmentalForecast: boolean;
  fdaAcknowledged: boolean;
  userId: string;
}

function computeConfidenceTier(totalSignals: number): ConfidenceTier {
  if (totalSignals >= 30) return "very_high";
  if (totalSignals >= 14) return "high";
  if (totalSignals >= 7) return "medium";
  return "low";
}

export function DashboardLeaderboard({
  eloRows,
  isPremium,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
}: DashboardLeaderboardProps) {
  const allergens: RankedAllergen[] = eloRows.map((row, index) => ({
    allergen_id: row.allergen_id,
    common_name: row.allergens.common_name,
    category: row.allergens.category as RankedAllergen["category"],
    elo_score: row.elo_score,
    confidence_tier: computeConfidenceTier(
      row.positive_signals + row.negative_signals
    ),
    rank: index + 1,
  }));

  return (
    <Leaderboard
      allergens={allergens}
      isPremium={isPremium}
      isEnvironmentalForecast={isEnvironmentalForecast}
      fdaAcknowledged={fdaAcknowledged}
      userId={userId}
    />
  );
}
