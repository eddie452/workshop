"use client";

/**
 * Dashboard Leaderboard Wrapper
 *
 * Client component that receives server-computed ranked allergens
 * and renders the Leaderboard component. Confidence tiers are
 * computed server-side via the engine module and passed as props.
 */

import { Leaderboard } from "@/components/leaderboard";
import type { RankedAllergen } from "@/components/leaderboard/types";

interface DashboardLeaderboardProps {
  allergens: RankedAllergen[];
  isPremium: boolean;
  isEnvironmentalForecast: boolean;
  fdaAcknowledged: boolean;
  userId: string;
}

export function DashboardLeaderboard({
  allergens,
  isPremium,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
}: DashboardLeaderboardProps) {
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
