/**
 * POST /api/trigger-scout/scan
 *
 * Trigger Scout plant photo identification endpoint. Processes:
 * 1. Authenticate user
 * 2. Validate base64 image data
 * 3. Send image to Google Cloud Vision AI for label detection
 * 4. Match labels against allergen seed data vision_labels
 * 5. Check conditions (symptoms present + seasonal active)
 * 6. Save scan to trigger_scout_scans table
 * 7. Return matched allergens with active/dormant status
 *
 * IMPORTANT: Raw images are NOT stored — only labels (metadata).
 * IMPORTANT: income_tier is NEVER included in any API response.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectLabels } from "@/lib/apis/vision";
import {
  matchLabelsToAllergens,
  analyzeScan,
  TRIGGER_SCOUT_PROXIMITY_MULTIPLIER,
} from "@/lib/engine/trigger-scout";
import { isAllergenActive } from "@/lib/engine/seasonal";
import allergenSeed from "@/lib/data/allergens-seed.json";
import type { Region } from "@/lib/supabase/types";
import type { ScoutAllergenSeed, ScoutConditions, ScoutMatch } from "@/lib/engine/trigger-scout";

/* ------------------------------------------------------------------ */
/* Request / Response types                                            */
/* ------------------------------------------------------------------ */

interface ScanRequestBody {
  /** Base64-encoded image data (without data URI prefix) */
  image_base64: string;
}

interface ScanSuccessResponse {
  success: true;
  scan_id: string;
  matches: Array<{
    allergen_id: string;
    common_name: string;
    category: string;
    matched_label: string;
    confidence: number;
    status: "active" | "dormant";
  }>;
  active_count: number;
  dormant_count: number;
  proximity_multiplier: number;
}

interface ScanErrorResponse {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Max image size: 4MB base64 (~3MB raw) */
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

/**
 * Build ScoutAllergenSeed array from the allergens seed JSON.
 */
function buildScoutAllergens(): ScoutAllergenSeed[] {
  return allergenSeed.map((a) => ({
    id: a.id,
    common_name: a.common_name,
    category: a.category,
    vision_labels: a.vision_labels ?? [],
    vision_min_confidence: a.vision_min_confidence ?? 0.7,
  }));
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
): Promise<NextResponse<ScanSuccessResponse | ScanErrorResponse>> {
  try {
    // ----------------------------------------------------------------
    // Step 1: Authenticate
    // ----------------------------------------------------------------
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false as const, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // ----------------------------------------------------------------
    // Step 2: Validate request body
    // ----------------------------------------------------------------
    const body: ScanRequestBody = await request.json();

    if (!body.image_base64 || typeof body.image_base64 !== "string") {
      return NextResponse.json(
        { success: false as const, error: "image_base64 is required" },
        { status: 400 },
      );
    }

    // Strip data URI prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = body.image_base64.includes(",")
      ? body.image_base64.split(",")[1]
      : body.image_base64;

    if (base64Data.length > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false as const, error: "Image exceeds 4MB size limit" },
        { status: 400 },
      );
    }

    // ----------------------------------------------------------------
    // Step 3: Send to Google Cloud Vision AI
    // ----------------------------------------------------------------
    const visionResult = await detectLabels(base64Data);

    if (!visionResult.success) {
      return NextResponse.json(
        {
          success: false as const,
          error: `Vision API failed: ${visionResult.error}`,
        },
        { status: 502 },
      );
    }

    // ----------------------------------------------------------------
    // Step 4: Match labels against allergen seed data
    // ----------------------------------------------------------------
    const scoutAllergens = buildScoutAllergens();
    const matches: ScoutMatch[] = matchLabelsToAllergens(
      visionResult.labels,
      scoutAllergens,
    );

    // ----------------------------------------------------------------
    // Step 5: Check conditions for each matched allergen
    // ----------------------------------------------------------------

    // Get user profile for region and latest symptom severity
    type ProfileQuery = {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{
            data: {
              home_region: string | null;
            } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: profile } = await (
      supabase.from("user_profiles") as unknown as ProfileQuery
    )
      .select("home_region")
      .eq("id", user.id)
      .single();

    const region: Region = (profile?.home_region as Region) ?? "Southeast";
    const currentMonth = new Date().getMonth() + 1;

    // Check for recent symptom check-in to determine if symptoms are present
    type RecentCheckinQuery = {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          is: (col: string, val: null) => {
            order: (col: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: Array<{ severity: number }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };

    const { data: recentCheckins } = await (
      supabase.from("symptom_checkins") as unknown as RecentCheckinQuery
    )
      .select("severity")
      .eq("user_id", user.id)
      .is("child_id", null)
      .order("checked_in_at", { ascending: false })
      .limit(1);

    const latestSeverity = recentCheckins?.[0]?.severity ?? 0;
    const symptomsPresent = latestSeverity > 0;

    // Build conditions map for each matched allergen
    const conditionsMap = new Map<string, ScoutConditions>();
    for (const match of matches) {
      conditionsMap.set(match.allergen_id, {
        symptoms_present: symptomsPresent,
        seasonal_active: isAllergenActive(match.allergen_id, region, currentMonth),
      });
    }

    // ----------------------------------------------------------------
    // Step 6: Analyze scan — determine active vs. dormant
    // ----------------------------------------------------------------
    const scanResult = analyzeScan(matches, conditionsMap);

    // ----------------------------------------------------------------
    // Step 7: Save scan to trigger_scout_scans (metadata only, no raw image)
    // ----------------------------------------------------------------
    const activeSet = new Set(scanResult.active_allergen_ids);
    const dormantSet = new Set(scanResult.dormant_allergen_ids);

    type InsertQuery = {
      insert: (data: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: insertedScan, error: insertError } = await (
      supabase.from("trigger_scout_scans") as unknown as InsertQuery
    )
      .insert({
        user_id: user.id,
        vision_labels: visionResult.labels,
        matched_allergen_ids: matches.map((m) => m.allergen_id),
        active_allergen_ids: scanResult.active_allergen_ids,
        dormant_allergen_ids: scanResult.dormant_allergen_ids,
        symptoms_present: symptomsPresent,
        latest_severity: latestSeverity,
        region,
        month: currentMonth,
      })
      .select("id")
      .single();

    if (insertError || !insertedScan) {
      return NextResponse.json(
        {
          success: false as const,
          error: `Scan save failed: ${insertError?.message ?? "unknown error"}`,
        },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // Step 8: Return results
    // ----------------------------------------------------------------
    const responseMatches = matches.map((m) => ({
      allergen_id: m.allergen_id,
      common_name: m.common_name,
      category: m.category,
      matched_label: m.matched_label,
      confidence: m.confidence,
      status: (activeSet.has(m.allergen_id)
        ? "active"
        : dormantSet.has(m.allergen_id)
          ? "dormant"
          : "dormant") as "active" | "dormant",
    }));

    return NextResponse.json({
      success: true as const,
      scan_id: insertedScan.id,
      matches: responseMatches,
      active_count: scanResult.active_allergen_ids.length,
      dormant_count: scanResult.dormant_allergen_ids.length,
      proximity_multiplier:
        scanResult.active_allergen_ids.length > 0
          ? TRIGGER_SCOUT_PROXIMITY_MULTIPLIER
          : 1.0,
    });
  } catch (error) {
    console.error("Trigger Scout scan error:", error);
    return NextResponse.json(
      {
        success: false as const,
        error: "An unexpected error occurred during scan",
      },
      { status: 500 },
    );
  }
}
