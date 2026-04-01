/**
 * POST /api/checkin
 *
 * Daily symptom check-in endpoint. Processes:
 * 1. Authenticate user
 * 2. Check for duplicate daily check-in
 * 3. Save symptom data to symptom_checkins table
 * 4. Fetch environmental snapshot server-side (pollen, AQI, weather)
 * 5. Trigger tournament engine re-run
 * 6. Update check-in with tournament results
 * 7. Return trigger champion and final four
 *
 * IMPORTANT: Environmental API failures must NOT block check-in save.
 * IMPORTANT: income_tier is NEVER included in any API response.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeatherData, WEATHER_DEFAULTS } from "@/lib/apis/weather";
import { getPollenData, POLLEN_DEFAULTS } from "@/lib/apis/pollen";
import { getAqiData, AQI_DEFAULTS } from "@/lib/apis/aqi";
import { runTournamentPipeline } from "@/lib/engine/run";
import type { SymptomPeakTime, SymptomCheckinInsert } from "@/lib/supabase/types";
import type { AllergenElo, AllergenSeedData, SymptomZone } from "@/lib/engine/types";
import type { WeatherResult } from "@/lib/apis/weather";
import type { PollenResult } from "@/lib/apis/pollen";
import type { AqiResult } from "@/lib/apis/aqi";
import allergenSeed from "@/lib/data/allergens-seed.json";

/* ------------------------------------------------------------------ */
/* Request / Response types                                            */
/* ------------------------------------------------------------------ */

interface CheckinRequestBody {
  severity: number;
  symptoms: Record<string, boolean>;
  symptom_peak_time: SymptomPeakTime;
  mostly_indoors: boolean;
}

interface CheckinSuccessResponse {
  success: true;
  checkin_id: string;
  symptom_gate_passed: boolean;
  trigger_champion: string | null;
  final_four: string[];
}

interface CheckinErrorResponse {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Map individual sx_* symptoms to engine SymptomZone types.
 * The engine zones (eyes, nose, throat, skin, lungs, stomach) differ
 * from the form zones (upper_respiratory, ocular, etc.).
 */
function mapSymptomsToEngineZones(
  symptoms: Record<string, boolean>,
): SymptomZone[] {
  const zones = new Set<SymptomZone>();

  // Ocular → eyes
  if (
    symptoms.sx_itchy_eyes ||
    symptoms.sx_watery_eyes ||
    symptoms.sx_red_eyes
  ) {
    zones.add("eyes");
  }

  // Upper respiratory → nose + throat
  if (
    symptoms.sx_sneezing ||
    symptoms.sx_runny_nose ||
    symptoms.sx_nasal_congestion ||
    symptoms.sx_nasal_itch
  ) {
    zones.add("nose");
  }

  // Ear fullness can indicate throat/ENT involvement
  if (symptoms.sx_ear_fullness) {
    zones.add("throat");
  }

  // Dermal → skin
  if (symptoms.sx_skin_rash || symptoms.sx_hives || symptoms.sx_eczema) {
    zones.add("skin");
  }

  // Lower respiratory → lungs
  if (
    symptoms.sx_cough ||
    symptoms.sx_wheeze ||
    symptoms.sx_chest_tightness ||
    symptoms.sx_shortness_breath
  ) {
    zones.add("lungs");
  }

  // Systemic symptoms (fatigue, headache, brain fog) → mapped to stomach
  // as a systemic proxy (the engine uses stomach for whole-body effects)
  if (symptoms.sx_fatigue || symptoms.sx_headache || symptoms.sx_brain_fog) {
    zones.add("stomach");
  }

  return Array.from(zones);
}

/**
 * Check if a check-in already exists for this user today (UTC day).
 */
async function hasCheckedInToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const today = new Date();
  const startOfDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  ).toISOString();
  const endOfDay = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + 1,
    ),
  ).toISOString();

  type CountQuery = {
    select: (
      cols: string,
      opts: { count: string; head: boolean },
    ) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          gte: (col: string, val: string) => {
            lt: (col: string, val: string) => Promise<{ count: number | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  const { count, error } = await (
    supabase.from("symptom_checkins") as unknown as CountQuery
  )
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("child_id", null)
    .gte("checked_in_at", startOfDay)
    .lt("checked_in_at", endOfDay);

  if (error) {
    // If query fails, allow the check-in (fail open for UX)
    return false;
  }

  return (count ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
): Promise<NextResponse<CheckinSuccessResponse | CheckinErrorResponse>> {
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
    // Step 2: Parse and validate request
    // ----------------------------------------------------------------
    const body: CheckinRequestBody = await request.json();

    if (typeof body.severity !== "number" || body.severity < 0 || body.severity > 3) {
      return NextResponse.json(
        { success: false as const, error: "Severity must be 0-3" },
        { status: 400 },
      );
    }

    // ----------------------------------------------------------------
    // Step 3: Check for duplicate daily check-in
    // ----------------------------------------------------------------
    const alreadyCheckedIn = await hasCheckedInToday(supabase, user.id);
    if (alreadyCheckedIn) {
      return NextResponse.json(
        { success: false as const, error: "Already checked in today" },
        { status: 409 },
      );
    }

    // ----------------------------------------------------------------
    // Step 4: Get user profile for location + CCRS data
    // ----------------------------------------------------------------
    type ProfileQuery = {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{
            data: {
              home_lat: number | null;
              home_lng: number | null;
              home_region: string | null;
              ccrs: number;
              cockroach_sighting: boolean;
            } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: profile } = await (
      supabase.from("user_profiles") as unknown as ProfileQuery
    )
      .select("home_lat, home_lng, home_region, ccrs, cockroach_sighting")
      .eq("id", user.id)
      .single();

    const lat = profile?.home_lat ?? null;
    const lng = profile?.home_lng ?? null;
    const region = profile?.home_region ?? "Southeast";
    const ccrs = profile?.ccrs ?? 0;
    const cockroachSighting = profile?.cockroach_sighting ?? false;

    // ----------------------------------------------------------------
    // Step 5: Save check-in row (before environmental fetch)
    // ----------------------------------------------------------------
    const symptoms = body.symptoms ?? {};
    const checkinData: SymptomCheckinInsert = {
      user_id: user.id,
      severity: body.severity,
      sx_sneezing: !!symptoms.sx_sneezing,
      sx_runny_nose: !!symptoms.sx_runny_nose,
      sx_nasal_congestion: !!symptoms.sx_nasal_congestion,
      sx_nasal_itch: !!symptoms.sx_nasal_itch,
      sx_itchy_eyes: !!symptoms.sx_itchy_eyes,
      sx_watery_eyes: !!symptoms.sx_watery_eyes,
      sx_red_eyes: !!symptoms.sx_red_eyes,
      sx_cough: !!symptoms.sx_cough,
      sx_wheeze: !!symptoms.sx_wheeze,
      sx_chest_tightness: !!symptoms.sx_chest_tightness,
      sx_shortness_breath: !!symptoms.sx_shortness_breath,
      sx_skin_rash: !!symptoms.sx_skin_rash,
      sx_hives: !!symptoms.sx_hives,
      sx_eczema: !!symptoms.sx_eczema,
      sx_ear_fullness: !!symptoms.sx_ear_fullness,
      sx_fatigue: !!symptoms.sx_fatigue,
      sx_headache: !!symptoms.sx_headache,
      sx_brain_fog: !!symptoms.sx_brain_fog,
      symptom_peak_time: body.symptom_peak_time ?? "all_day",
      mostly_indoors: body.mostly_indoors ?? false,
    };

    type InsertQuery = {
      insert: (data: SymptomCheckinInsert) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: insertedCheckin, error: insertError } = await (
      supabase.from("symptom_checkins") as unknown as InsertQuery
    )
      .insert(checkinData)
      .select("id")
      .single();

    if (insertError || !insertedCheckin) {
      return NextResponse.json(
        {
          success: false as const,
          error: `Check-in save failed: ${insertError?.message ?? "unknown error"}`,
        },
        { status: 500 },
      );
    }

    const checkinId = insertedCheckin.id;

    // ----------------------------------------------------------------
    // Step 6: Fetch environmental snapshot (graceful degradation)
    // ----------------------------------------------------------------
    let weather: WeatherResult = WEATHER_DEFAULTS;
    let pollen: PollenResult = POLLEN_DEFAULTS;
    let aqi: AqiResult = AQI_DEFAULTS;

    if (lat !== null && lng !== null) {
      const [weatherResult, pollenResult, aqiResult] = await Promise.allSettled([
        getWeatherData(lat, lng),
        getPollenData(lat, lng),
        getAqiData(lat, lng),
      ]);

      weather =
        weatherResult.status === "fulfilled"
          ? weatherResult.value
          : WEATHER_DEFAULTS;
      pollen =
        pollenResult.status === "fulfilled"
          ? pollenResult.value
          : POLLEN_DEFAULTS;
      aqi =
        aqiResult.status === "fulfilled" ? aqiResult.value : AQI_DEFAULTS;
    }

    // Update check-in with environmental data
    type UpdateQuery = {
      update: (data: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };

    await (supabase.from("symptom_checkins") as unknown as UpdateQuery)
      .update({
        pollen_upi_tree: pollen.upi_tree,
        pollen_upi_grass: pollen.upi_grass,
        pollen_upi_weed: pollen.upi_weed,
        aqi: aqi.aqi,
        humidity_pct: weather.humidity_pct,
        temp_f: weather.temp_f,
        wind_mph: weather.wind_mph,
        wind_direction_deg: weather.wind_direction_deg,
        rain_last_12h: weather.rain_last_12h,
        thunderstorm_6h: weather.thunderstorm_6h,
      })
      .eq("id", checkinId);

    // ----------------------------------------------------------------
    // Step 7: Fetch Elo records for tournament
    // ----------------------------------------------------------------
    type EloQuery = {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          is: (col: string, val: null) => Promise<{
            data: Array<{
              allergen_id: string;
              elo_score: number;
              positive_signals: number;
              negative_signals: number;
            }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: eloRows } = await (
      supabase.from("user_allergen_elo") as unknown as EloQuery
    )
      .select("allergen_id, elo_score, positive_signals, negative_signals")
      .eq("user_id", user.id)
      .is("child_id", null);

    const allergenElos: AllergenElo[] = (eloRows ?? []).map((row) => ({
      allergen_id: row.allergen_id,
      elo_score: row.elo_score,
      positive_signals: row.positive_signals,
      negative_signals: row.negative_signals,
    }));

    // ----------------------------------------------------------------
    // Step 8: Run tournament pipeline
    // ----------------------------------------------------------------
    const engineZones = mapSymptomsToEngineZones(symptoms);

    // Build allergen seed data for the engine
    const seedData: AllergenSeedData[] = allergenSeed.map((a) => ({
      id: a.id,
      common_name: a.common_name,
      category: a.category,
      base_elo: a.base_elo,
      region_northeast: a.region_northeast,
      region_midwest: a.region_midwest,
      region_northwest: a.region_northwest,
      region_south_central: a.region_south_central,
      region_southeast: a.region_southeast,
      region_southwest: a.region_southwest,
      particle_size_um:
        ((a as Record<string, unknown>).particle_size_um_min as number | null) ?? 25,
      settling_velocity_cm_s:
        ((a as Record<string, unknown>).settling_velocity_cm_s as number | null) ?? 1.0,
      spp_producer: (a as Record<string, unknown>).spp_producer as boolean ?? false,
      lrt_capable: (a as Record<string, unknown>).lrt_capable as boolean ?? false,
      lrt_max_miles:
        ((a as Record<string, unknown>).lrt_max_miles as number | null) ?? null,
      lrt_source_regions:
        ((a as Record<string, unknown>).lrt_source_regions as string[] | null) ?? [],
    }));

    const currentMonth = new Date().getMonth() + 1;

    const runResult = runTournamentPipeline({
      allergens: seedData,
      allergen_elos: allergenElos,
      symptoms: {
        zones: engineZones,
        global_severity: body.severity,
      },
      region: region as import("@/lib/supabase/types").Region,
      month: currentMonth,
      ccrs_input: {
        ccrs,
        cockroach_sighting: cockroachSighting,
        mostly_indoors: body.mostly_indoors,
        global_severity: body.severity,
      },
      wind_direction_deg: weather.wind_direction_deg,
      environment: { weather, pollen },
      trigger_scout_allergens: [],
    });

    // ----------------------------------------------------------------
    // Step 9: Persist tournament results to check-in row
    // ----------------------------------------------------------------
    const triggerChampionId =
      runResult.tournament?.trigger_champion?.allergen_id ?? null;
    const finalFourIds = (runResult.tournament?.final_four ?? []).map(
      (e) => e.allergen_id,
    );

    await (supabase.from("symptom_checkins") as unknown as UpdateQuery)
      .update({
        trigger_champion_id: triggerChampionId,
        final_four: finalFourIds,
        leaderboard_json: runResult.tournament?.leaderboard ?? null,
      })
      .eq("id", checkinId);

    // ----------------------------------------------------------------
    // Step 10: Persist Elo updates
    // ----------------------------------------------------------------
    if (runResult.elo_updates.length > 0) {
      for (const update of runResult.elo_updates) {
        type EloUpdateQuery = {
          update: (data: Record<string, unknown>) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                is: (col: string, val: null) => Promise<{ error: { message: string } | null }>;
              };
            };
          };
        };

        const existingRow = (eloRows ?? []).find(
          (r) => r.allergen_id === update.allergen_id,
        );
        const currentPositive = existingRow?.positive_signals ?? 0;
        const currentNegative = existingRow?.negative_signals ?? 0;

        const { error: eloUpdateError } = await (supabase.from("user_allergen_elo") as unknown as EloUpdateQuery)
          .update({
            elo_score: update.new_elo,
            positive_signals:
              update.delta >= 0 ? currentPositive + 1 : currentPositive,
            negative_signals:
              update.delta < 0 ? currentNegative + 1 : currentNegative,
            last_updated: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("allergen_id", update.allergen_id)
          .is("child_id", null);

        if (eloUpdateError) {
          console.error(`Elo update failed for ${update.allergen_id}:`, eloUpdateError.message);
        }
      }
    }

    // ----------------------------------------------------------------
    // Response (income_tier NEVER included)
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true as const,
      checkin_id: checkinId,
      symptom_gate_passed: runResult.symptom_gate_passed,
      trigger_champion: triggerChampionId,
      final_four: finalFourIds,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      {
        success: false as const,
        error: "An unexpected error occurred during check-in",
      },
      { status: 500 },
    );
  }
}
