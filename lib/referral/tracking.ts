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

/** Type for supabase.rpc() calls */
type RpcCall = (
  fn: string,
  params: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

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
 * Uses a Postgres RPC function (`record_referral`) to execute all 3 operations
 * (insert referral, increment count, conditionally unlock) in a single
 * atomic transaction. If any step fails, the entire operation rolls back.
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
  const { data, error } = await (supabase.rpc as unknown as RpcCall)("record_referral", {
    p_referral_code: referralCode,
    p_referred_id: referredUserId,
  });

  if (error) {
    return { success: false, error: `Transaction failed: ${error.message}` };
  }

  const result = data as { success: boolean; error?: string; features_unlocked?: boolean };

  return {
    success: result.success,
    error: result.error,
    features_unlocked: result.features_unlocked,
  };
}
