"use client";

/**
 * Dashboard Leaderboard Wrapper
 *
 * Client component that receives server-computed ranked allergens
 * and renders the Leaderboard component. Confidence tiers are
 * computed server-side via the engine module and passed as props.
 *
 * The gated Final Four payload (#157) is also prepared server-side
 * to prevent raw ranks #2-#4 values from leaking to free users who
 * have not yet unlocked the reveal.
 */

import { Leaderboard } from "@/components/leaderboard";
import type {
  RankedAllergen,
  GatedRankedAllergen,
} from "@/components/leaderboard/types";

interface DashboardLeaderboardProps {
  allergens: RankedAllergen[];
  finalFourGated?: GatedRankedAllergen[];
  isFinalFourUnlocked?: boolean;
  referralCount?: number;
  isPremium: boolean;
  hasFullRankings?: boolean;
  isEnvironmentalForecast: boolean;
  fdaAcknowledged: boolean;
  userId: string;
}

export function DashboardLeaderboard({
  allergens,
  finalFourGated,
  isFinalFourUnlocked,
  referralCount,
  isPremium,
  hasFullRankings,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
}: DashboardLeaderboardProps) {
  return (
    <Leaderboard
      allergens={allergens}
      finalFourGated={finalFourGated}
      isFinalFourUnlocked={isFinalFourUnlocked}
      referralCount={referralCount}
      isPremium={isPremium}
      hasFullRankings={hasFullRankings}
      isEnvironmentalForecast={isEnvironmentalForecast}
      fdaAcknowledged={fdaAcknowledged}
      userId={userId}
    />
  );
}
