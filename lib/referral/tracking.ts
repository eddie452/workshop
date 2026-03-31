/**
 * Referral Tracking Logic
 *
 * Server-side functions for recording referrals and checking unlock status.
 * These functions operate on Supabase and must only run server-side.
 *
 * IMPORTANT: income_tier is NEVER included in any response from these functions.
 */

import { REFERRAL_UNLOCK_THRESHOLD } from "./constants";
import { generateReferralCode } from "./code";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SupabaseDB = SupabaseClient<Database>;

export interface ReferralStatus {
  referral_code: string;
  referral_count: number;
  features_unlocked: boolean;
  referrals_needed: number;
}

/* ------------------------------------------------------------------ */
/* Query result shapes                                                 */
/* ------------------------------------------------------------------ */

interface ProfileCodeRow {
  referral_code: string | null;
}

interface ProfileCountRow {
  referral_count: number;
  features_unlocked: boolean;
}

interface ReferrerRow {
  id: string;
  referral_count: number;
  features_unlocked: boolean;
}

interface ReferralIdRow {
  id: string;
}

/* ------------------------------------------------------------------ */
/* Type-safe query helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Helper type to work around Supabase strict PostgREST typing.
 * The same pattern used in checkin/route.ts and forecast/route.ts.
 */
interface EqResult<T> {
  eq: (col: string, val: string) => EqResult<T>;
  single: () => Promise<{ data: T | null; error: { message: string; code?: string } | null }>;
  maybeSingle: () => Promise<{ data: T | null; error: { message: string; code?: string } | null }>;
}

interface QueryChain<T> {
  select: (columns: string) => EqResult<T>;
  update: (data: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: { message: string; code?: string } | null }>;
  };
  insert: (data: Record<string, unknown>) => Promise<{ error: { message: string; code?: string } | null }>;
}

/**
 * Ensure a user has a referral code, generating one if needed.
 *
 * Uses a retry loop to handle the (unlikely) case of a code collision.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @returns The user's referral code
 */
export async function ensureReferralCode(
  supabase: SupabaseDB,
  userId: string,
): Promise<string> {
  // Check if user already has a code
  const profileQuery = supabase.from("user_profiles") as unknown as QueryChain<ProfileCodeRow>;
  const { data: profile } = await profileQuery
    .select("referral_code")
    .eq("id", userId)
    .single();

  if (profile?.referral_code) {
    return profile.referral_code;
  }

  // Generate and save a new code (retry on collision)
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateReferralCode();
    const updateQuery = supabase.from("user_profiles") as unknown as QueryChain<ProfileCodeRow>;
    const { error } = await updateQuery
      .update({ referral_code: code })
      .eq("id", userId);

    if (!error) {
      return code;
    }

    // If it's a unique constraint violation, retry with a new code
    if (error.code === "23505") {
      continue;
    }

    throw new Error(`Failed to save referral code: ${error.message}`);
  }

  throw new Error("Failed to generate unique referral code after retries");
}

/**
 * Get the current referral status for a user.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @returns Current referral status including count and unlock state
 */
export async function getReferralStatus(
  supabase: SupabaseDB,
  userId: string,
): Promise<ReferralStatus> {
  const code = await ensureReferralCode(supabase, userId);

  const profileQuery = supabase.from("user_profiles") as unknown as QueryChain<ProfileCountRow>;
  const { data: profile } = await profileQuery
    .select("referral_count, features_unlocked")
    .eq("id", userId)
    .single();

  const referralCount = profile?.referral_count ?? 0;
  const featuresUnlocked = profile?.features_unlocked ?? false;

  return {
    referral_code: code,
    referral_count: referralCount,
    features_unlocked: featuresUnlocked,
    referrals_needed: featuresUnlocked
      ? 0
      : Math.max(0, REFERRAL_UNLOCK_THRESHOLD - referralCount),
  };
}

/**
 * Record a referral and update the referrer's count.
 *
 * This function:
 * 1. Validates the referral code belongs to a real user
 * 2. Ensures the referred user is not self-referring
 * 3. Creates the referral record
 * 4. Increments the referrer's referral_count
 * 5. Checks if the threshold is met and unlocks features if so
 *
 * @param supabase - Authenticated Supabase client (service role or with appropriate RLS)
 * @param referralCode - The referral code used during signup
 * @param referredUserId - The ID of the new user who signed up
 * @returns Object indicating success and whether features were unlocked
 */
export async function recordReferral(
  supabase: SupabaseDB,
  referralCode: string,
  referredUserId: string,
): Promise<{ success: boolean; error?: string; features_unlocked?: boolean }> {
  // Find the referrer by code
  const referrerQuery = supabase.from("user_profiles") as unknown as QueryChain<ReferrerRow>;
  const { data: referrer } = await referrerQuery
    .select("id, referral_count, features_unlocked")
    .eq("referral_code", referralCode)
    .single();

  if (!referrer) {
    return { success: false, error: "Invalid referral code" };
  }

  // Prevent self-referral
  if (referrer.id === referredUserId) {
    return { success: false, error: "Cannot refer yourself" };
  }

  // Check for duplicate referral
  const dupQuery = supabase.from("referrals") as unknown as QueryChain<ReferralIdRow>;
  const { data: existing } = await dupQuery
    .select("id")
    .eq("referrer_id", referrer.id)
    .eq("referred_id", referredUserId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Referral already recorded" };
  }

  // Insert the referral record
  const insertQuery = supabase.from("referrals") as unknown as QueryChain<ReferralIdRow>;
  const { error: insertError } = await insertQuery.insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
  });

  if (insertError) {
    return { success: false, error: `Failed to record referral: ${insertError.message}` };
  }

  // Increment referral count
  const newCount = (referrer.referral_count ?? 0) + 1;
  const shouldUnlock = newCount >= REFERRAL_UNLOCK_THRESHOLD;

  const updateData: Record<string, unknown> = {
    referral_count: newCount,
  };

  // Unlock is permanent — only set to true, never revert
  if (shouldUnlock && !referrer.features_unlocked) {
    updateData.features_unlocked = true;
  }

  const profileUpdateQuery = supabase.from("user_profiles") as unknown as QueryChain<ReferrerRow>;
  const { error: updateError } = await profileUpdateQuery
    .update(updateData)
    .eq("id", referrer.id);

  if (updateError) {
    return { success: false, error: `Failed to update referral count: ${updateError.message}` };
  }

  return {
    success: true,
    features_unlocked: shouldUnlock || (referrer.features_unlocked ?? false),
  };
}
