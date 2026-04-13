/**
 * POST /api/onboarding
 *
 * Processes the onboarding submission:
 * 1. Geocode address → lat/lng, state, zip
 * 2. Fetch property data from BatchData (graceful fallback)
 * 3. Fetch Census income tier (silent model weight, NEVER in response)
 * 4. Derive region from state
 * 5. Derive CCRS from home profile
 * 6. Save user_profile to Supabase
 * 7. Create user_location (home)
 * 8. Seed user_allergen_elo for regional allergens
 *
 * IMPORTANT: income_tier is NEVER included in the API response.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/apis/geocoding";
import { getPropertyData } from "@/lib/apis/batchdata";
import { getBlockGroupIncome } from "@/lib/apis/census";
import { getRegionFromState, deriveCCRS } from "@/lib/onboarding";
import { initializeAllElo } from "@/lib/engine/elo";
import allergenSeed from "@/lib/data/allergens-seed.json";
import type {
  Region,
  SeasonalPattern,
  HomeType,
  UserProfileInsert,
  UserLocationInsert,
  UserAllergenEloInsert,
} from "@/lib/supabase/types";
import type { Allergen } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* Request body type                                                    */
/* ------------------------------------------------------------------ */

interface OnboardingRequest {
  address: string;
  has_pets: boolean;
  pet_types?: string[];
  prior_allergy_diagnosis: boolean;
  known_allergens?: string[];
  seasonal_pattern: SeasonalPattern;
  cockroach_sighting?: boolean;
  has_mold_moisture?: boolean;
  smoking_in_home?: boolean;
  /** Manual overrides when BatchData is unavailable */
  manual_home_type?: HomeType;
  manual_year_built?: number;
  manual_sqft?: number;
}

/* ------------------------------------------------------------------ */
/* Response types                                                       */
/* ------------------------------------------------------------------ */

interface OnboardingResponse {
  success: true;
  profile: {
    home_region: Region | null;
    home_state: string | null;
    home_lat: number | null;
    home_lng: number | null;
    ccrs: number;
  };
  allergen_count: number;
}

interface OnboardingErrorResponse {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/* Route handler                                                        */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
): Promise<NextResponse<OnboardingResponse | OnboardingErrorResponse>> {
  try {
    // Authenticate
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

    // Parse body
    const body: OnboardingRequest = await request.json();

    if (!body.address || typeof body.address !== "string") {
      return NextResponse.json(
        { success: false as const, error: "Address is required" },
        { status: 400 },
      );
    }

    // ----------------------------------------------------------------
    // Step 1: Geocode address (graceful fallback)
    // ----------------------------------------------------------------
    let lat: number | null = null;
    let lng: number | null = null;
    let state: string | null = null;
    let zip: string | null = null;
    let formattedAddress: string | null = body.address;

    try {
      const geocodeResult = await geocodeAddress(body.address);
      lat = geocodeResult.lat;
      lng = geocodeResult.lng;
      state = geocodeResult.state;
      zip = geocodeResult.zip;
      formattedAddress = geocodeResult.formatted_address;
    } catch {
      // Geocoding failed — proceed without coordinates.
      // User can still complete onboarding.
    }

    // ----------------------------------------------------------------
    // Step 2: Fetch property data (graceful fallback)
    // ----------------------------------------------------------------
    let yearBuilt: number | null = body.manual_year_built ?? null;
    let homeType: string | null = body.manual_home_type ?? null;
    let sqft: number | null = body.manual_sqft ?? null;

    try {
      const propertyData = await getPropertyData(body.address);
      if (propertyData) {
        yearBuilt = propertyData.year_built ?? yearBuilt;
        homeType = propertyData.home_type ?? homeType;
        sqft = propertyData.sqft ?? sqft;
      }
    } catch {
      // BatchData failed — use manual overrides or null
    }

    // ----------------------------------------------------------------
    // Step 3: Fetch Census income tier (SILENT — never in response)
    // ----------------------------------------------------------------
    let incomeTier: number | null = null;

    if (lat !== null && lng !== null) {
      try {
        const censusResult = await getBlockGroupIncome(lat, lng);
        if (censusResult) {
          incomeTier = censusResult.income_tier;
        }
      } catch {
        // Census failed — leave income_tier null
      }
    }

    // ----------------------------------------------------------------
    // Step 4: Derive region from state
    // ----------------------------------------------------------------
    const region = getRegionFromState(state);

    // ----------------------------------------------------------------
    // Step 5: Derive CCRS from home profile
    // ----------------------------------------------------------------
    const ccrs = deriveCCRS({
      region,
      yearBuilt,
      homeType,
      cockroachSighting: body.cockroach_sighting ?? false,
    });

    // ----------------------------------------------------------------
    // Step 6: Upsert user_profile
    // ----------------------------------------------------------------
    const profileData: UserProfileInsert = {
      id: user.id,
      home_address: formattedAddress,
      home_lat: lat,
      home_lng: lng,
      home_zip: zip,
      home_state: state,
      home_region: region,
      home_year_built: yearBuilt,
      home_type: homeType as HomeType | null,
      home_sqft: sqft,
      ccrs,
      has_pets: body.has_pets,
      pet_types: body.pet_types ?? null,
      has_mold_moisture: body.has_mold_moisture ?? false,
      smoking_in_home: body.smoking_in_home ?? false,
      cockroach_sighting: body.cockroach_sighting ?? false,
      prior_allergy_diagnosis: body.prior_allergy_diagnosis,
      known_allergens: body.known_allergens ?? null,
      seasonal_pattern: body.seasonal_pattern,
      income_tier: incomeTier,
    };

    const { error: profileError } = await (supabase
      .from("user_profiles") as unknown as { upsert: (data: UserProfileInsert, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }> })
      .upsert(profileData, { onConflict: "id" });

    if (profileError) {
      return NextResponse.json(
        { success: false as const, error: `Profile save failed: ${profileError.message}` },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // Step 7: Create home location
    // ----------------------------------------------------------------
    const locationData: UserLocationInsert = {
      user_id: user.id,
      is_home: true,
      nickname: "Home",
      address: formattedAddress,
      lat,
      lng,
      zip,
      state,
      region: region,
      ccrs,
      year_built: yearBuilt,
      home_type: homeType,
      has_pets: body.has_pets,
      pet_types: body.pet_types ?? null,
      cockroach_sighting: body.cockroach_sighting ?? false,
    };

    const { error: locationError } = await (supabase
      .from("user_locations") as unknown as { upsert: (data: UserLocationInsert, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }> })
      .upsert(locationData, { onConflict: "user_id,is_home" });

    if (locationError) {
      // Non-fatal — profile was saved, location can be recreated
      console.error("Location save warning:", locationError.message);
    }

    // ----------------------------------------------------------------
    // Step 8: Seed user_allergen_elo for regional allergens
    // ----------------------------------------------------------------
    const effectiveRegion: Region = region ?? "Southeast";

    // Filter allergens to those with regional presence > 0
    const regionField = `region_${effectiveRegion.toLowerCase().replaceAll(" ", "_")}` as keyof (typeof allergenSeed)[0];
    const regionalAllergens = allergenSeed.filter(
      (a) => (a[regionField] as number) > 0,
    );

    // Cast seed data to engine Allergen type for Elo initialization
    const allergenData: Allergen[] = regionalAllergens.map((a) => ({
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
    }));

    // Initialize Elo scores
    const eloRecords = initializeAllElo(allergenData, effectiveRegion);

    // Batch insert Elo records
    const eloInserts: UserAllergenEloInsert[] = eloRecords.map((elo) => ({
      user_id: user.id,
      allergen_id: elo.allergen_id,
      elo_score: elo.elo_score,
      positive_signals: 0,
      negative_signals: 0,
    }));

    if (eloInserts.length > 0) {
      // Delete existing Elo records first (re-onboarding case)
      type ChainableQuery = { delete: () => { eq: (col: string, val: string) => { is: (col: string, val: null) => Promise<{ error: { message: string } | null }> } } };
      await (supabase.from("user_allergen_elo") as unknown as ChainableQuery)
        .delete()
        .eq("user_id", user.id)
        .is("child_id", null);

      type InsertQuery = { insert: (data: UserAllergenEloInsert[]) => Promise<{ error: { message: string } | null }> };
      const { error: eloError } = await (supabase
        .from("user_allergen_elo") as unknown as InsertQuery)
        .insert(eloInserts);

      if (eloError) {
        console.error("Elo seeding failed:", eloError.message);
        return NextResponse.json(
          { success: false, error: "Failed to initialize allergen data. Please try again." },
          { status: 500 },
        );
      }
    }

    // ----------------------------------------------------------------
    // Response (income_tier NEVER included)
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true as const,
      profile: {
        home_region: region,
        home_state: state,
        home_lat: lat,
        home_lng: lng,
        ccrs,
      },
      allergen_count: eloInserts.length,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      {
        success: false as const,
        error: "An unexpected error occurred during onboarding",
      },
      { status: 500 },
    );
  }
}
