import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConfidenceTierBySignals } from "@/lib/engine";
import type { RankedAllergen, CheckinSeverityQuery } from "@/components/leaderboard/types";
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

  // Fetch subscription tier
  const { data: subscriptionData } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .single();

  const subscription = subscriptionData as { tier: string } | null;
  const tier = subscription?.tier ?? "free";
  const isPremium = tier === "madness_plus" || tier === "madness_family";

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

  // Map to ranked allergens with confidence tiers (server-side computation)
  const allergens: RankedAllergen[] = eloRows.map((row, index) => ({
    allergen_id: row.allergen_id,
    common_name: row.allergens.common_name,
    category: row.allergens.category as RankedAllergen["category"],
    elo_score: row.elo_score,
    confidence_tier: getConfidenceTierBySignals(
      row.positive_signals + row.negative_signals
    ),
    rank: index + 1,
  }));

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

      <DashboardLeaderboard
        allergens={allergens}
        isPremium={isPremium}
        isEnvironmentalForecast={isEnvironmentalForecast}
        fdaAcknowledged={fdaAcknowledged}
        userId={user.id}
      />
    </PageContainer>
  );
}
