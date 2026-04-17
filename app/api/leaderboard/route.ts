import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildRankedFromEloRows } from "@/lib/engine";

/**
 * Shape returned by the Supabase join query.
 * Defined explicitly because the generated types do not include
 * foreign-key relationships for `!inner` joins.
 */
interface EloRowWithAllergen {
  allergen_id: string;
  elo_score: number;
  positive_signals: number;
  negative_signals: number;
  allergens: {
    common_name: string;
    category: string;
  };
}

/**
 * GET /api/leaderboard
 *
 * Returns the authenticated user's allergen leaderboard.
 * Joins user_allergen_elo with allergens to produce ranked results.
 *
 * Security:
 * - Requires authenticated user (RLS enforces row-level access)
 * - NEVER returns income_tier
 * - Returns subscription tier for freemium gating
 */
export async function GET() {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user profile for fda_acknowledged
  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("fda_acknowledged")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }

  const profile = profileData as { fda_acknowledged: boolean } | null;

  // Fetch subscription tier
  const { data: subscriptionData } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .single();

  const subscription = subscriptionData as { tier: string } | null;
  const tier = subscription?.tier ?? "free";
  const isPremium = tier === "madness_plus" || tier === "madness_family";

  // Fetch user's allergen Elo scores, joined with allergen info
  const { data: rawEloRows, error: eloError } = await supabase
    .from("user_allergen_elo")
    .select(
      `
      allergen_id,
      elo_score,
      positive_signals,
      negative_signals,
      allergens!inner (
        common_name,
        category
      )
    `
    )
    .eq("user_id", user.id)
    .is("child_id", null)
    .order("elo_score", { ascending: false });

  if (eloError) {
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }

  const eloRows = (rawEloRows ?? []) as unknown as EloRowWithAllergen[];

  // Determine if this is Environmental Forecast mode
  // (no Elo data means no symptoms have been processed)
  const isEnvironmentalForecast = eloRows.length === 0;

  // Two-layer confidence model (issue #193) — delegated to the
  // shared `buildRankedFromEloRows` helper (issue #200) so the API
  // and the dashboard page stay locked to the same seed / runs /
  // noise.
  //
  // `scoreSource: "discriminative"` preserves this route's existing
  // behavior: `score` maps to the Elo-separation sigmoid so clients
  // reading the back-compat `score` field still see visible variation
  // between #1 and #N (the 21% flat-line bug was caused by feeding
  // it a signal-count metric).
  const { allergens } = buildRankedFromEloRows(
    eloRows.map((row) => ({
      allergen_id: row.allergen_id,
      elo_score: row.elo_score,
      positive_signals: row.positive_signals,
      negative_signals: row.negative_signals,
      common_name: row.allergens.common_name,
      category: row.allergens.category,
    })),
    { seed: 0, scoreSource: "discriminative" },
  );

  return NextResponse.json({
    allergens,
    isPremium,
    isEnvironmentalForecast,
    fdaAcknowledged: profile?.fda_acknowledged ?? false,
  });
}

