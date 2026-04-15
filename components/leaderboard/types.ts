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
  /**
   * Numeric confidence in [0, 1] — companion to `confidence_tier`,
   * emitted by the engine per issue #160 and consumed by the shared
   * `<ConfidenceBadge score={...} />`. Kept alongside the legacy
   * `confidence_tier` string during the migration to avoid cascading
   * changes through the gated Final Four and PDF report code paths.
   */
  score: number;
  rank: number;
}

/**
 * A ranked allergen entry that may be redacted server-side for gated tiers.
 * When `locked` is true, `common_name`, `elo_score`, and `confidence_tier`
 * are stripped before the payload is serialized to the client, so the
 * browser never receives the underlying values (defense in depth against
 * view-source reveal). Used for Final Four ranks #2-#4 on the free tier.
 */
export interface GatedRankedAllergen {
  allergen_id: string;
  rank: number;
  category: AllergenCategory;
  /** null when locked — client must render a placeholder */
  common_name: string | null;
  /** null when locked */
  elo_score: number | null;
  /** null when locked */
  confidence_tier: ConfidenceTier | null;
  /**
   * Numeric confidence in [0, 1]; null when locked (stripped server-side
   * along with the other identifying fields).
   */
  score: number | null;
  /** true means the entry is server-redacted and should render as a silhouette */
  locked: boolean;
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
  /**
   * Allergens ranked #2-#4. May be fully revealed (common_name, elo_score,
   * confidence_tier all present) or server-redacted for free users with
   * fewer than 3 referral credits (values set to null, `locked: true`).
   */
  allergens: GatedRankedAllergen[];
  /**
   * Whether the Final Four reveal is unlocked. When false, the entire
   * bracket renders behind a BlurOverlay plus the unlock CTA card.
   * This is independent of `locked` on individual entries: `isUnlocked`
   * controls chrome (blur, CTA); `locked` controls whether the card's
   * data is redacted.
   */
  isUnlocked: boolean;
  /** Number of successful referral invites the user has. 0-3+. */
  referralCount?: number;
  /**
   * Optional tracking callbacks fired from the unlock CTA. Callers can
   * wire these to analytics; default is a no-op.
   */
  onUnlockCtaImpression?: () => void;
  onInviteClick?: () => void;
  onUpgradeClick?: () => void;
}

/** Props for a single allergen row in the ranked list */
export interface AllergenRankRowProps {
  allergen: RankedAllergen;
  /** Whether this row should be blurred (free-tier gate) */
  isBlurred: boolean;
}

/**
 * Type-safe query chain for fetching the latest check-in severity.
 * Used to determine Environmental Forecast mode (severity = 0).
 */
export type CheckinSeverityQuery = {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      is: (col: string, val: null) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => {
            single: () => Promise<{
              data: { severity: number } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
};

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
