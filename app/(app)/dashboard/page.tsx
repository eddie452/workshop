import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getConfidenceTierBySignals,
  getConfidenceScoreBySignals,
  getDiscriminativeConfidence,
  getPosteriorConfidence,
  getConfidenceTierByPosterior,
} from "@/lib/engine";
import type { TournamentEntry } from "@/lib/engine";
import { buildBracketTrace } from "@/lib/engine/tournament";
import type { BracketMatch } from "@/lib/engine/types";
import type {
  RankedAllergen,
  GatedRankedAllergen,
  CheckinSeverityQuery,
} from "@/components/leaderboard/types";
import { gateFinalFour } from "@/lib/leaderboard/gate-final-four";
import {
  getCachedAccessStatus,
  hasFeatureAccess,
} from "@/lib/subscription";
import { Bracket } from "@/components/bracket";
import { DashboardLeaderboard } from "./dashboard-leaderboard";
import { PageContainer } from "@/components/layout";

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for FDA acknowledgment status
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("fda_acknowledged")
    .eq("id", user.id)
    .single();

  const profile = profileData as { fda_acknowledged: boolean } | null;
  const fdaAcknowledged = profile?.fda_acknowledged ?? false;

  // Resolve subscription + referral access via the canonical helper.
  // `getCachedAccessStatus` honors `expires_at` against `now()` so an
  // expired subscriber (whose tier hasn't been flipped yet) is correctly
  // treated as inactive. React `cache()` makes this free to call across
  // the request — no duplicate DB round-trips.
  const accessStatus = await getCachedAccessStatus(supabase, user.id);
  const isPremium = accessStatus.subscriptionActive;

  // Fetch referral count for the Final Four gated reveal (#157).
  // `referralUnlocked` (the permanent `features_unlocked` flag) is
  // already carried inside `accessStatus`; only the live count needs
  // a separate read.
  const { data: referralProfile } = await supabase
    .from("user_profiles")
    .select("referral_count")
    .eq("id", user.id)
    .single();

  const referralRow = referralProfile as {
    referral_count: number | null;
  } | null;

  const referralCount = referralRow?.referral_count ?? 0;
  const referralUnlocked = accessStatus.referralUnlocked;

  // Granular feature check for the Full Rankings section (ranks #5+).
  // Uses the centralized `hasFeatureAccess` helper so the gate can
  // evolve independently of other premium features in the future.
  const hasFullRankings = hasFeatureAccess(accessStatus, "full_rankings");

  // Fetch allergen Elo rankings
  const { data: rawEloRows } = await supabase
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

  const eloRows = (rawEloRows ?? []) as unknown as EloRowWithAllergen[];

  // Two-layer confidence model (issue #193) — mirrors the logic in
  // `app/api/leaderboard/route.ts` so the dashboard's server-rendered
  // payload carries `discriminative` + `posterior` into the bracket UI
  // (issue #179).
  const elos = eloRows.map((row) => row.elo_score);
  const tournamentEntries: TournamentEntry[] = eloRows.map((row) => ({
    allergen_id: row.allergen_id,
    common_name: row.allergens.common_name,
    category: row.allergens.category,
    composite_score: row.elo_score,
    tier: "low" as const,
  }));
  const posteriors = getPosteriorConfidence(tournamentEntries, { seed: 0 });

  // Map to ranked allergens with confidence tiers + numeric score
  // (server-side computation; score derivation lives in @/lib/engine).
  const allergens: RankedAllergen[] = eloRows.map((row, index) => {
    const totalSignals = row.positive_signals + row.negative_signals;
    const discriminative = getDiscriminativeConfidence(row.elo_score, elos);
    const posterior = posteriors[row.allergen_id] ?? 0;
    return {
      allergen_id: row.allergen_id,
      common_name: row.allergens.common_name,
      category: row.allergens.category as RankedAllergen["category"],
      elo_score: row.elo_score,
      // Tier prefers the posterior (issue #193), falling back to legacy
      // signal-count derivation if the posterior is non-finite.
      confidence_tier: Number.isFinite(posterior)
        ? getConfidenceTierByPosterior(posterior)
        : getConfidenceTierBySignals(totalSignals),
      // `score` stays as the legacy surface for components that haven't
      // migrated yet; `discriminative` / `posterior` are the two-layer
      // signals the bracket UI reads.
      score: getConfidenceScoreBySignals(totalSignals),
      discriminative,
      posterior,
      rank: index + 1,
    };
  });

  // Bracket trace for the #179 bracket UI. `tournamentEntries` is
  // already ordered by Elo descending (the Supabase query orders by
  // elo_score desc), which matches `pairwiseSort`'s ordering for
  // distinct composite scores. The engine helper handles byes for
  // non-power-of-two counts and returns an empty trace for
  // zero/one-entry inputs.
  const bracketTrace: BracketMatch[] = buildBracketTrace(tournamentEntries);

  // Determine if we should show Environmental Forecast mode.
  // Forecast mode activates when the user's most recent check-in has severity = 0,
  // OR when they have no Elo data yet (first-time user).
  let isEnvironmentalForecast = eloRows.length === 0;

  const { data: latestCheckin } = await (
    supabase.from("symptom_checkins") as unknown as CheckinSeverityQuery
  )
    .select("severity")
    .eq("user_id", user.id)
    .is("child_id", null)
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .single();

  if (latestCheckin?.severity === 0) {
    isEnvironmentalForecast = true;
  }

  // Compute the client-facing payload. The Final Four (ranks #2-#4) is
  // redacted for free users without the required referral credits. The
  // champion (#1) and rows beyond #4 are passed through unchanged.
  const finalFourView = gateFinalFour({
    allergens,
    isPremium,
    referralCount,
    referralUnlocked,
  });

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-bold text-brand-primary-dark">
          Welcome to Allergy Madness
        </h1>
        <p className="mt-1 mb-0 text-sm text-brand-text-secondary">
          Signed in as {user.email}
        </p>
      </div>

      {/* Tournament bracket (ticket #179). Rendered above the
          leaderboard so users can see the path to their champion
          before the ranked list. Hidden in Environmental Forecast
          mode — no tournament has been played yet. */}
      {!isEnvironmentalForecast && bracketTrace.length > 0 && (
        <div className="mb-6">
          <Bracket nodes={bracketTrace} ranked={allergens} />
        </div>
      )}

      <DashboardLeaderboard
        allergens={finalFourView.allergensForClient}
        finalFourGated={finalFourView.gated}
        isFinalFourUnlocked={finalFourView.isUnlocked}
        referralCount={referralCount}
        isPremium={isPremium}
        hasFullRankings={hasFullRankings}
        isEnvironmentalForecast={isEnvironmentalForecast}
        fdaAcknowledged={fdaAcknowledged}
        userId={user.id}
      />
    </PageContainer>
  );
}
