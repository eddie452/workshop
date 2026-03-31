/**
 * GET /api/report/pdf
 *
 * Generates a downloadable PDF report of the user's allergen leaderboard.
 *
 * Security:
 * - Requires authenticated user (Supabase RLS enforces row-level access)
 * - NEVER returns income_tier
 * - No health data in URL parameters
 * - Server-side generation only
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReportPdf } from "@/lib/pdf";
import type { PdfAllergenEntry } from "@/lib/pdf";
import type { ConfidenceTier } from "@/lib/engine/types";

/** Shape returned by the Supabase join query */
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
 * Compute confidence tier based on total signal count.
 */
function computeConfidenceTier(totalSignals: number): ConfidenceTier {
  if (totalSignals >= 30) return "very_high";
  if (totalSignals >= 14) return "high";
  if (totalSignals >= 7) return "medium";
  return "low";
}

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

  // Fetch user profile (display_name, region — NEVER income_tier)
  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, home_region")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }

  const profile = profileData as {
    display_name: string | null;
    home_region: string | null;
  } | null;

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
      { error: "Failed to load leaderboard data" },
      { status: 500 }
    );
  }

  const eloRows = (rawEloRows ?? []) as unknown as EloRowWithAllergen[];

  if (eloRows.length === 0) {
    return NextResponse.json(
      { error: "No allergen data available. Complete a symptom check-in first." },
      { status: 404 }
    );
  }

  // Map to PDF allergen entries
  const allergens: PdfAllergenEntry[] = eloRows.map((row, index) => ({
    rank: index + 1,
    common_name: row.allergens.common_name,
    category: row.allergens.category as PdfAllergenEntry["category"],
    elo_score: row.elo_score,
    confidence_tier: computeConfidenceTier(
      row.positive_signals + row.negative_signals
    ),
  }));

  // Generate PDF
  const pdfBuffer = generateReportPdf({
    childName: profile?.display_name ?? "Your Child",
    generatedAt: new Date().toISOString(),
    region: profile?.home_region ?? null,
    allergens,
  });

  // Return PDF as downloadable file
  return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="allergy-madness-report.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
