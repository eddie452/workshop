/**
 * POST /api/referral/invite
 *
 * Generates or retrieves the authenticated user's referral link.
 * The link uses the request origin (never hardcoded) to build the URL.
 *
 * Response:
 *   { referral_link: string, referral_code: string }
 *
 * IMPORTANT: income_tier is NEVER included in any API response.
 * IMPORTANT: Referral links contain NO health data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureReferralCode, buildReferralLink } from "@/lib/referral";

export async function POST(request: NextRequest) {
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

    const referralCode = await ensureReferralCode(supabase, user.id);

    // Use request origin — NEVER hardcode the URL
    const origin = request.headers.get("origin")
      ?? request.headers.get("referer")?.replace(/\/[^/]*$/, "")
      ?? request.nextUrl.origin;

    const referralLink = buildReferralLink(origin, referralCode);

    return NextResponse.json({
      referral_link: referralLink,
      referral_code: referralCode,
    });
  } catch (error) {
    console.error("Referral invite error:", error);
    return NextResponse.json(
      { error: "Failed to generate referral link" },
      { status: 500 },
    );
  }
}
