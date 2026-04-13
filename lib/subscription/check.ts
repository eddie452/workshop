/**
 * Subscription Status Checker
 *
 * Server-side utility that determines a user's premium access status
 * by combining subscription tier, expiry, and referral unlock state.
 *
 * Key behavior:
 * - PAYWALL_ENABLED=false: all users treated as premium (workshop mode)
 * - PAYWALL_ENABLED=true: checks subscription + referral status
 * - Referral unlock is permanent and independent of subscription
 *
 * Preferred entry point for server components: `getCachedAccessStatus`.
 * It deduplicates DB queries within a single Next.js request via
 * React `cache()`. Use `getAccessStatus` only when you need a fresh
 * (uncached) query.
 *
 * IMPORTANT: income_tier is NEVER included in any output.
 */

import { cache } from "react";
import { PAYWALL_ENABLED, PREMIUM_TIERS, TIER_FEATURES } from "./constants";
import type { AccessStatus, PremiumFeature, SubscriptionTier } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SupabaseDB = SupabaseClient<Database>;

/* ------------------------------------------------------------------ */
/* Type-safe query helpers (same pattern as referral/tracking.ts)      */
/* ------------------------------------------------------------------ */

interface SubscriptionRow {
  tier: SubscriptionTier;
  expires_at: string | null;
}

interface ProfileRow {
  features_unlocked: boolean;
}

interface EqResult<T> {
  eq: (col: string, val: string) => EqResult<T>;
  single: () => Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
  maybeSingle: () => Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}

interface QueryChain<T> {
  select: (columns: string) => EqResult<T>;
}

/**
 * Get the full access status for a user.
 *
 * Queries user_subscriptions and user_profiles to determine whether
 * the user has premium access via subscription or referral.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The authenticated user's ID
 * @returns AccessStatus with tier, active state, and premium flag
 */
export async function getAccessStatus(
  supabase: SupabaseDB,
  userId: string,
): Promise<AccessStatus> {
  // If paywall is disabled, everyone is premium
  if (!PAYWALL_ENABLED) {
    return {
      tier: "free",
      subscriptionActive: false,
      referralUnlocked: false,
      isPremium: true,
    };
  }

  // Fetch subscription and referral status in parallel
  const subQuery = supabase.from(
    "user_subscriptions",
  ) as unknown as QueryChain<SubscriptionRow>;
  const profileQuery = supabase.from(
    "user_profiles",
  ) as unknown as QueryChain<ProfileRow>;

  const [subResult, profileResult] = await Promise.all([
    subQuery.select("tier, expires_at").eq("user_id", userId).maybeSingle(),
    profileQuery.select("features_unlocked").eq("id", userId).single(),
  ]);

  const subscription = subResult.data;
  const profile = profileResult.data;

  const tier: SubscriptionTier = subscription?.tier ?? "free";
  const referralUnlocked = profile?.features_unlocked ?? false;

  // Check if subscription is active (not expired)
  const subscriptionActive =
    PREMIUM_TIERS.includes(tier) && isSubscriptionActive(subscription);

  // Premium = active subscription OR permanent referral unlock
  const isPremium = subscriptionActive || referralUnlocked;

  return {
    tier,
    subscriptionActive,
    referralUnlocked,
    isPremium,
  };
}

/* ------------------------------------------------------------------ */
/* Per-request cache                                                    */
/* ------------------------------------------------------------------ */

/**
 * Request-scoped cache for getAccessStatus results.
 *
 * React `cache()` creates a new Map per server request in Next.js,
 * so results are never shared across users or requests. Within a
 * single request, multiple calls with the same userId skip the DB.
 */
const getRequestCache = cache(
  () => new Map<string, Promise<AccessStatus>>(),
);

/**
 * Cached version of getAccessStatus — deduplicates DB queries within
 * the same server request. Safe because React `cache()` is request-scoped.
 */
export function getCachedAccessStatus(
  supabase: SupabaseDB,
  userId: string,
): Promise<AccessStatus> {
  const requestCache = getRequestCache();
  const existing = requestCache.get(userId);
  if (existing) return existing;

  const promise = getAccessStatus(supabase, userId);
  requestCache.set(userId, promise);
  return promise;
}

/**
 * Check if a specific premium feature is available to the user.
 *
 * This is the primary API for gating features. It encapsulates the
 * PAYWALL_ENABLED check, subscription tier, and referral status.
 * Uses per-request caching to avoid redundant DB queries.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The authenticated user's ID
 * @param feature - The premium feature to check
 * @returns true if the user can access the feature
 */
export async function isFeatureAvailable(
  supabase: SupabaseDB,
  userId: string,
  feature: PremiumFeature,
): Promise<boolean> {
  // Paywall off = everything available
  if (!PAYWALL_ENABLED) {
    return true;
  }

  const status = await getCachedAccessStatus(supabase, userId);

  // Referral unlock grants all premium features
  if (status.referralUnlocked) {
    return true;
  }

  // Check tier-based feature access
  if (status.subscriptionActive) {
    return TIER_FEATURES[status.tier].includes(feature);
  }

  return false;
}

/**
 * Synchronous check for whether a user has premium access.
 *
 * Use this when you already have the access status (e.g., from a
 * server component that passed it as a prop). Does not query the DB.
 *
 * @param status - Pre-fetched AccessStatus
 * @param feature - The premium feature to check
 * @returns true if the user can access the feature
 */
export function hasFeatureAccess(
  status: AccessStatus,
  feature: PremiumFeature,
): boolean {
  // Paywall off = everything available
  if (!PAYWALL_ENABLED) {
    return true;
  }

  if (status.isPremium) {
    return true;
  }

  if (status.subscriptionActive) {
    return TIER_FEATURES[status.tier].includes(feature);
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                     */
/* ------------------------------------------------------------------ */

function isSubscriptionActive(
  subscription: SubscriptionRow | null,
): boolean {
  if (!subscription) return false;

  // No expiry means lifetime / non-expiring subscription
  if (!subscription.expires_at) return true;

  return new Date(subscription.expires_at) > new Date();
}
