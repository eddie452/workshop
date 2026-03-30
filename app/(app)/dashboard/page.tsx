import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { DashboardLeaderboard } from "./dashboard-leaderboard";

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
  const isEnvironmentalForecast = eloRows.length === 0;

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8"
      style={{
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      <div
        className="mb-6 flex items-center justify-between"
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Welcome to Allergy Madness
          </h1>
          <p
            className="text-sm text-gray-600"
            style={{
              fontSize: "0.875rem",
              color: "#4b5563",
              margin: "0.25rem 0 0 0",
            }}
          >
            Signed in as {user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      <DashboardLeaderboard
        eloRows={eloRows}
        isPremium={isPremium}
        isEnvironmentalForecast={isEnvironmentalForecast}
        fdaAcknowledged={profile?.fda_acknowledged ?? false}
        userId={user.id}
      />
    </div>
  );
}
