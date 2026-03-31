/**
 * Leaderboard Component Types
 *
 * Shared type definitions for the leaderboard display components.
 * These types are client-safe — no server-only data (income_tier)
 * is included.
 */

import type { ConfidenceTier } from "@/lib/engine/types";
import type { AllergenCategory } from "@/lib/supabase/types";

/** A ranked allergen for display on the leaderboard */
export interface RankedAllergen {
  allergen_id: string;
  common_name: string;
  category: AllergenCategory;
  elo_score: number;
  confidence_tier: ConfidenceTier;
  rank: number;
}

/** Props for the full leaderboard container */
export interface LeaderboardProps {
  /** Ranked allergens sorted by Elo descending */
  allergens: RankedAllergen[];
  /** Whether the user has premium access (Madness+ or referral-unlocked) */
  isPremium: boolean;
  /** Whether severity is 0 (triggers Environmental Forecast mode) */
  isEnvironmentalForecast: boolean;
}

/** Props for the Trigger Champion card */
export interface TriggerChampionCardProps {
  /** The #1 ranked allergen */
  allergen: RankedAllergen;
}

/** Props for the Final Four bracket display */
export interface FinalFourProps {
  /** Allergens ranked #2-#4 */
  allergens: RankedAllergen[];
  /** Whether to blur for free-tier users */
  isBlurred: boolean;
}

/** Props for a single allergen row in the ranked list */
export interface AllergenRankRowProps {
  allergen: RankedAllergen;
  /** Whether this row should be blurred (free-tier gate) */
  isBlurred: boolean;
}

/** Props for the blur overlay */
export interface BlurOverlayProps {
  children: React.ReactNode;
  /** Number of referrals still needed to unlock (passed to UpgradeCta) */
  referralsNeeded?: number;
  /** Feature name for contextual CTA messaging */
  featureLabel?: string;
  /** Whether to show the upgrade CTA below the lock icon */
  showUpgradeCta?: boolean;
}
