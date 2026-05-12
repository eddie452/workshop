import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPfasData } from "@/lib/pfas/get-pfas-data";

/**
 * GET /api/pfas
 *
 * Returns PFAS (Pollen-Food Allergy Syndrome) cross-reactivity data
 * for the authenticated user's top 5 allergens.
 *
 * Security:
 * - Requires authentication (RLS-enforced)
 * - Strategic shift (#288): premium gating removed. Every authenticated
 *   user receives the full `cross_reactive_foods` array.
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
      isPremium: true,
    });
  }

  // Get PFAS data from seed — full food lists returned to every user
  const pfasData = getPfasData(topAllergenIds);

  return NextResponse.json({
    ...pfasData,
    isPremium: true,
  });
}
