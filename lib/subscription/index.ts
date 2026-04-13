/**
 * Subscription System
 *
 * Re-exports for the freemium gate and subscription scaffolding.
 *
 * Usage:
 *   import { isFeatureAvailable, PAYWALL_ENABLED } from "@/lib/subscription";
 */

export { PAYWALL_ENABLED, TIER_FEATURES, PREMIUM_TIERS } from "./constants";
export { getAccessStatus, getCachedAccessStatus, isFeatureAvailable, hasFeatureAccess } from "./check";
export type { AccessStatus, PremiumFeature, SubscriptionTier } from "./types";
