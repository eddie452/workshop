/**
 * Subscription Types
 *
 * Type definitions for the freemium gate and subscription system.
 * Re-uses SubscriptionTier from the database types for consistency.
 */

import type { SubscriptionTier } from "@/lib/supabase/types";

export type { SubscriptionTier };

/** Features that can be gated behind a subscription */
export type PremiumFeature =
  | "final_four"
  | "pdf_report"
  | "detailed_confidence";

/** Result of checking a user's access level */
export interface AccessStatus {
  /** The user's subscription tier */
  tier: SubscriptionTier;
  /** Whether the subscription is currently active (not expired) */
  subscriptionActive: boolean;
  /** Whether features are unlocked via 3-friend referral (permanent) */
  referralUnlocked: boolean;
  /** Whether the user has premium access (subscription OR referral) */
  isPremium: boolean;
}
