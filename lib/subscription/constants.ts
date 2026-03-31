/**
 * Subscription Constants
 *
 * Centralized configuration for the freemium gate system.
 *
 * PAYWALL_ENABLED controls whether the freemium gate is active.
 * When false (default for workshop/development), all features are
 * accessible regardless of subscription or referral status.
 */

import type { PremiumFeature, SubscriptionTier } from "./types";

/**
 * Whether the paywall is enabled.
 * Reads from NEXT_PUBLIC_PAYWALL_ENABLED env var.
 * Defaults to false (workshop mode — everything unlocked).
 */
export const PAYWALL_ENABLED =
  process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

/**
 * Map of which features each tier can access.
 * When PAYWALL_ENABLED is false, this map is bypassed entirely.
 */
export const TIER_FEATURES: Record<SubscriptionTier, PremiumFeature[]> = {
  free: [],
  madness_plus: ["final_four", "pdf_report", "detailed_confidence", "full_rankings"],
  madness_family: ["final_four", "pdf_report", "detailed_confidence", "full_rankings"],
};

/**
 * Tiers that grant full premium access (bypass feature checks).
 */
export const PREMIUM_TIERS: SubscriptionTier[] = [
  "madness_plus",
  "madness_family",
];
