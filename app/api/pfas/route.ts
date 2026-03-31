import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureAvailable } from "@/lib/subscription/check";
import { getPfasData } from "@/lib/pfas/get-pfas-data";

/**
 * GET /api/pfas
 *
 * Returns PFAS (Pollen-Food Allergy Syndrome) cross-reactivity data
 * for the authenticated user's top 5 allergens.
 *
 * Security:
 * - Requires authentication (RLS-enforced)
 * - Full food lists only returned for Madness+ / referral-unlocked users
 * - Free users receive allergen names + severity but food lists are empty
 * - NEVER returns income_tier
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

  // Check premium access for PFAS panel
  const hasPfasAccess = await isFeatureAvailable(
    supabase,
    user.id,
    "pfas_panel",
  );

  // Fetch user's top 5 allergens by Elo score
  const { data: eloRows, error: eloError } = await supabase
    .from("user_allergen_elo")
    .select("allergen_id")
    .eq("user_id", user.id)
    .is("child_id", null)
    .order("elo_score", { ascending: false })
    .limit(5);

  if (eloError) {
    return NextResponse.json(
      { error: "Failed to load allergen data" },
      { status: 500 },
    );
  }

  const topAllergenIds = (eloRows ?? []).map(
    (row: { allergen_id: string }) => row.allergen_id,
  );

  if (topAllergenIds.length === 0) {
    return NextResponse.json({
      entries: [],
      hasData: false,
      isPremium: hasPfasAccess,
    });
  }

  // Get PFAS data from seed
  const pfasData = getPfasData(topAllergenIds);

  // For free users: return allergen names and severity but strip food lists
  if (!hasPfasAccess) {
    return NextResponse.json({
      entries: pfasData.entries.map((entry) => ({
        ...entry,
        cross_reactive_foods: [],
      })),
      hasData: pfasData.hasData,
      isPremium: false,
    });
  }

  return NextResponse.json({
    ...pfasData,
    isPremium: true,
  });
}
