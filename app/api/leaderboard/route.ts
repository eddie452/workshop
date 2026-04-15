import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getConfidenceTierBySignals,
  getDiscriminativeConfidence,
  getPosteriorConfidence,
  getConfidenceTierByPosterior,
} from "@/lib/engine";
import type { TournamentEntry } from "@/lib/engine";
import type { RankedAllergen } from "@/components/leaderboard/types";

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

  // Two-layer confidence model (issue #193):
  //   - discriminative: per-allergen Elo separation from the pack
  //   - posterior: Monte Carlo top-K frequency → drives the tier string
  // Legacy signal-count surfaces (`score`, `confidence_tier`) are kept
  // populated for back-compat with older callers during the migration.
  const elos = eloRows.map((row) => row.elo_score);
  const tournamentEntries: TournamentEntry[] = eloRows.map((row) => ({
    allergen_id: row.allergen_id,
    common_name: row.allergens.common_name,
    category: row.allergens.category,
    composite_score: row.elo_score,
    // Placeholder — the posterior run does not use `tier`.
    tier: "low" as const,
  }));
  const posteriors = getPosteriorConfidence(tournamentEntries, {
    seed: 0,
  });

  const allergens: RankedAllergen[] = eloRows.map((row, index) => {
    const totalSignals = row.positive_signals + row.negative_signals;
    const discriminative = getDiscriminativeConfidence(row.elo_score, elos);
    const posterior = posteriors[row.allergen_id] ?? 0;
    return {
      allergen_id: row.allergen_id,
      common_name: row.allergens.common_name,
      category: row.allergens.category as RankedAllergen["category"],
      elo_score: row.elo_score,
      // Tier now derives from the posterior (issue #193). Falls back
      // to the legacy signal-count tier if the posterior is somehow
      // non-finite — defense in depth for the migration window.
      confidence_tier: Number.isFinite(posterior)
        ? getConfidenceTierByPosterior(posterior)
        : getConfidenceTierBySignals(totalSignals),
      // `score` is the back-compat numeric surface: it now maps to
      // the discriminative layer so older UI that reads `score` still
      // shows visible variation between #1 and #N (the 21% flat-line
      // bug was caused by feeding it a signal-count metric).
      score: discriminative,
      discriminative,
      posterior,
      rank: index + 1,
    };
  });

  return NextResponse.json({
    allergens,
    isPremium,
    isEnvironmentalForecast,
    fdaAcknowledged: profile?.fda_acknowledged ?? false,
  });
}

