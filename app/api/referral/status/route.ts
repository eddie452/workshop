/**
 * GET /api/referral/status
 *
 * Returns the authenticated user's referral progress:
 *   - referral_code: their unique code
 *   - referral_count: how many friends signed up
 *   - features_unlocked: whether all features are permanently unlocked
 *   - referrals_needed: how many more referrals to reach threshold
 *
 * IMPORTANT: income_tier is NEVER included in any API response.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReferralStatus } from "@/lib/referral";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const status = await getReferralStatus(supabase, user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Referral status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral status" },
      { status: 500 },
    );
  }
}
