"use client";

/**
 * Dashboard Leaderboard Wrapper
 *
 * Client component that receives server-computed ranked allergens
 * and renders the Leaderboard component. Confidence tiers are
 * computed server-side via the engine module and passed as props.
 *
 * Strategic shift (#288): the Final Four gated payload was removed
 * along with the referral / Madness+ unlock CTA. Every user receives
 * the full ranked list.
 */

import { Leaderboard } from "@/components/leaderboard";
import type { RankedAllergen } from "@/components/leaderboard/types";

interface DashboardLeaderboardProps {
  allergens: RankedAllergen[];
  /** Retained for downstream consumers (PFAS panel etc.); no longer gates Final Four / Full Rankings. */
  referralCount?: number;
  isPremium: boolean;
  hasFullRankings?: boolean;
  isEnvironmentalForecast: boolean;
  fdaAcknowledged: boolean;
  userId: string;
  /** Forwarded to the underlying Leaderboard. See #242. */
  showFdaDisclaimer?: boolean;
  /** Forwarded to the underlying Leaderboard. See #242. */
  showFullRankings?: boolean;
}

export function DashboardLeaderboard({
  allergens,
  isPremium,
  hasFullRankings,
  isEnvironmentalForecast,
  fdaAcknowledged,
  userId,
  showFdaDisclaimer,
  showFullRankings,
}: DashboardLeaderboardProps) {
  return (
    <Leaderboard
      allergens={allergens}
      isPremium={isPremium}
      hasFullRankings={hasFullRankings}
      isEnvironmentalForecast={isEnvironmentalForecast}
      fdaAcknowledged={fdaAcknowledged}
      userId={userId}
      showFdaDisclaimer={showFdaDisclaimer}
      showFullRankings={showFullRankings}
    />
  );
}
