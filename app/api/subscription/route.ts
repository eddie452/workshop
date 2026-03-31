/**
 * Subscription Status API
 *
 * GET /api/subscription
 *
 * Returns the authenticated user's subscription and access status.
 * Used by client components to determine feature availability.
 *
 * IMPORTANT: income_tier is NEVER included in responses.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessStatus, PAYWALL_ENABLED } from "@/lib/subscription";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getAccessStatus(supabase, user.id);

    return NextResponse.json({
      success: true,
      paywall_enabled: PAYWALL_ENABLED,
      ...status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
