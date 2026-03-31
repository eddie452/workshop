/**
 * Supabase Database Types for Allergy Madness
 *
 * Manually authored to match AllergyMadness_schema_v1.sql.
 * Regenerate with `npx supabase gen types` once a live project exists.
 *
 * IMPORTANT: income_tier exists in the database but must NEVER appear
 * in any API response. It is intentionally excluded from Row types
 * exposed to the client. Server-only code that needs it should query
 * the column directly.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ------------------------------------------------------------------ */
/* Enum-like union types (mirror CHECK constraints)                    */
/* ------------------------------------------------------------------ */

export type Region =
  | "Northeast"
  | "Midwest"
  | "Northwest"
  | "South Central"
  | "Southeast"
  | "Southwest";

export type HomeType =
  | "single_family"
  | "condo"
  | "apartment_low_rise"
  | "apartment_high_rise"
  | "townhouse"
  | "mobile"
  | "other";

export type HomeConstruction =
  | "wood_frame"
  | "brick_old"
  | "brick_modern"
  | "concrete_highrise"
  | "modern_sealed"
  | "other";

export type SeasonalPattern =
  | "spring"
  | "summer"
  | "fall"
  | "year_round"
  | "unknown";

export type AllergenCategory =
  | "tree"
  | "grass"
  | "weed"
  | "mold"
  | "indoor"
  | "food";

export type SppRiskLevel =
  | "very_high"
  | "high"
  | "moderate"
  | "low"
  | "none";

export type PfasSeverity =
  | "mild_oas"
  | "moderate"
  | "systemic_risk"
  | "none";

export type SymptomPeakTime =
  | "morning"
  | "midday"
  | "evening"
  | "all_day";

export type MatchMethod =
  | "exact"
  | "genus"
  | "fallback_shortlist"
  | "no_match";

export type MultiplierReason =
  | "seasonal_calendar"
  | "api_confirmed"
  | "dormant";

export type SubscriptionTier =
  | "free"
  | "madness_plus"
  | "madness_family";

export type SubscriptionPlatform =
  | "ios"
  | "android"
  | "stripe"
  | "none";

export type IntlCockroachTier =
  | "very_high"
  | "high"
  | "moderate"
  | "low"
  | "suppressed";

/* ------------------------------------------------------------------ */
/* Database interface                                                  */
/* ------------------------------------------------------------------ */

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
          home_address: string | null;
          home_lat: number | null;
          home_lng: number | null;
          home_zip: string | null;
          home_state: string | null;
          home_region: Region | null;
          home_year_built: number | null;
          home_type: HomeType | null;
          home_sqft: number | null;
          home_construction: HomeConstruction | null;
          ccrs: number;
          has_pets: boolean;
          pet_types: string[] | null;
          has_mold_moisture: boolean;
          smoking_in_home: boolean;
          cockroach_sighting: boolean;
          prior_allergy_diagnosis: boolean;
          known_allergens: string[] | null;
          seasonal_pattern: SeasonalPattern | null;
          /** Excluded from API responses. Server-only. */
          income_tier: number | null;
          neighborhood_ndvi: number | null;
          /** Has user acknowledged the FDA disclaimer? */
          fda_acknowledged: boolean;
          /** Unique referral code for sharing */
          referral_code: string | null;
          /** Number of successful referrals */
          referral_count: number;
          /** Whether all features are permanently unlocked via referrals */
          features_unlocked: boolean;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          home_address?: string | null;
          home_lat?: number | null;
          home_lng?: number | null;
          home_zip?: string | null;
          home_state?: string | null;
          home_region?: Region | null;
          home_year_built?: number | null;
          home_type?: HomeType | null;
          home_sqft?: number | null;
          home_construction?: HomeConstruction | null;
          ccrs?: number;
          has_pets?: boolean;
          pet_types?: string[] | null;
          has_mold_moisture?: boolean;
          smoking_in_home?: boolean;
          cockroach_sighting?: boolean;
          prior_allergy_diagnosis?: boolean;
          known_allergens?: string[] | null;
          seasonal_pattern?: SeasonalPattern | null;
          income_tier?: number | null;
          neighborhood_ndvi?: number | null;
          fda_acknowledged?: boolean;
          referral_code?: string | null;
          referral_count?: number;
          features_unlocked?: boolean;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          home_address?: string | null;
          home_lat?: number | null;
          home_lng?: number | null;
          home_zip?: string | null;
          home_state?: string | null;
          home_region?: Region | null;
          home_year_built?: number | null;
          home_type?: HomeType | null;
          home_sqft?: number | null;
          home_construction?: HomeConstruction | null;
          ccrs?: number;
          has_pets?: boolean;
          pet_types?: string[] | null;
          has_mold_moisture?: boolean;
          smoking_in_home?: boolean;
          cockroach_sighting?: boolean;
          prior_allergy_diagnosis?: boolean;
          known_allergens?: string[] | null;
          seasonal_pattern?: SeasonalPattern | null;
          income_tier?: number | null;
          neighborhood_ndvi?: number | null;
          fda_acknowledged?: boolean;
          referral_code?: string | null;
          referral_count?: number;
          features_unlocked?: boolean;
        };
      };

      child_profiles: {
        Row: {
          id: string;
          parent_id: string;
          name: string;
          birth_year: number | null;
          created_at: string;
          has_pets: boolean | null;
          prior_allergy_diagnosis: boolean;
          known_allergens: string[] | null;
        };
        Insert: {
          id?: string;
          parent_id: string;
          name: string;
          birth_year?: number | null;
          created_at?: string;
          has_pets?: boolean | null;
          prior_allergy_diagnosis?: boolean;
          known_allergens?: string[] | null;
        };
        Update: {
          id?: string;
          parent_id?: string;
          name?: string;
          birth_year?: number | null;
          created_at?: string;
          has_pets?: boolean | null;
          prior_allergy_diagnosis?: boolean;
          known_allergens?: string[] | null;
        };
      };

      allergens: {
        Row: {
          id: string;
          common_name: string;
          botanical_name: string | null;
          iuis_designation: string | null;
          category: AllergenCategory;
          sub_category: string | null;
          vision_labels: string[] | null;
          vision_min_confidence: number;
          particle_size_um_min: number | null;
          particle_size_um_max: number | null;
          settling_velocity_cm_s: number | null;
          spp_producer: boolean;
          spp_risk_level: SppRiskLevel | null;
          lrt_capable: boolean;
          lrt_max_miles: number | null;
          lrt_source_regions: string[] | null;
          base_elo: number;
          region_northeast: number;
          region_midwest: number;
          region_northwest: number;
          region_south_central: number;
          region_southeast: number;
          region_southwest: number;
          cross_reactive_foods: string[] | null;
          pfas_severity: PfasSeverity | null;
          image_asset_path: string | null;
          avoidance_tips: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          common_name: string;
          botanical_name?: string | null;
          iuis_designation?: string | null;
          category: AllergenCategory;
          sub_category?: string | null;
          vision_labels?: string[] | null;
          vision_min_confidence?: number;
          particle_size_um_min?: number | null;
          particle_size_um_max?: number | null;
          settling_velocity_cm_s?: number | null;
          spp_producer?: boolean;
          spp_risk_level?: SppRiskLevel | null;
          lrt_capable?: boolean;
          lrt_max_miles?: number | null;
          lrt_source_regions?: string[] | null;
          base_elo?: number;
          region_northeast?: number;
          region_midwest?: number;
          region_northwest?: number;
          region_south_central?: number;
          region_southeast?: number;
          region_southwest?: number;
          cross_reactive_foods?: string[] | null;
          pfas_severity?: PfasSeverity | null;
          image_asset_path?: string | null;
          avoidance_tips?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          common_name?: string;
          botanical_name?: string | null;
          iuis_designation?: string | null;
          category?: AllergenCategory;
          sub_category?: string | null;
          vision_labels?: string[] | null;
          vision_min_confidence?: number;
          particle_size_um_min?: number | null;
          particle_size_um_max?: number | null;
          settling_velocity_cm_s?: number | null;
          spp_producer?: boolean;
          spp_risk_level?: SppRiskLevel | null;
          lrt_capable?: boolean;
          lrt_max_miles?: number | null;
          lrt_source_regions?: string[] | null;
          base_elo?: number;
          region_northeast?: number;
          region_midwest?: number;
          region_northwest?: number;
          region_south_central?: number;
          region_southeast?: number;
          region_southwest?: number;
          cross_reactive_foods?: string[] | null;
          pfas_severity?: PfasSeverity | null;
          image_asset_path?: string | null;
          avoidance_tips?: string | null;
          created_at?: string;
        };
      };

      seasonal_calendar: {
        Row: {
          id: string;
          allergen_id: string;
          region: Region;
          month: number;
          activity_level: number;
        };
        Insert: {
          id?: string;
          allergen_id: string;
          region: Region;
          month: number;
          activity_level?: number;
        };
        Update: {
          id?: string;
          allergen_id?: string;
          region?: Region;
          month?: number;
          activity_level?: number;
        };
      };

      user_allergen_elo: {
        Row: {
          id: string;
          user_id: string;
          child_id: string | null;
          allergen_id: string;
          location_id: string | null;
          elo_score: number;
          positive_signals: number;
          negative_signals: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          child_id?: string | null;
          allergen_id: string;
          location_id?: string | null;
          elo_score?: number;
          positive_signals?: number;
          negative_signals?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          child_id?: string | null;
          allergen_id?: string;
          location_id?: string | null;
          elo_score?: number;
          positive_signals?: number;
          negative_signals?: number;
          last_updated?: string;
        };
      };

      user_locations: {
        Row: {
          id: string;
          user_id: string;
          nickname: string | null;
          is_home: boolean;
          address: string | null;
          lat: number | null;
          lng: number | null;
          zip: string | null;
          state: string | null;
          country_code: string;
          region: string | null;
          ccrs: number;
          year_built: number | null;
          home_type: string | null;
          construction: string | null;
          has_pets: boolean;
          pet_types: string[] | null;
          cockroach_sighting: boolean;
          intl_cockroach_tier: IntlCockroachTier | null;
          proximity_allergens: string[] | null;
          typical_visit_months: number[] | null;
          last_visit: string | null;
          visit_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nickname?: string | null;
          is_home?: boolean;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          zip?: string | null;
          state?: string | null;
          country_code?: string;
          region?: string | null;
          ccrs?: number;
          year_built?: number | null;
          home_type?: string | null;
          construction?: string | null;
          has_pets?: boolean;
          pet_types?: string[] | null;
          cockroach_sighting?: boolean;
          intl_cockroach_tier?: IntlCockroachTier | null;
          proximity_allergens?: string[] | null;
          typical_visit_months?: number[] | null;
          last_visit?: string | null;
          visit_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nickname?: string | null;
          is_home?: boolean;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          zip?: string | null;
          state?: string | null;
          country_code?: string;
          region?: string | null;
          ccrs?: number;
          year_built?: number | null;
          home_type?: string | null;
          construction?: string | null;
          has_pets?: boolean;
          pet_types?: string[] | null;
          cockroach_sighting?: boolean;
          intl_cockroach_tier?: IntlCockroachTier | null;
          proximity_allergens?: string[] | null;
          typical_visit_months?: number[] | null;
          last_visit?: string | null;
          visit_count?: number;
          created_at?: string;
        };
      };

      symptom_checkins: {
        Row: {
          id: string;
          user_id: string;
          child_id: string | null;
          location_id: string | null;
          is_travel: boolean;
          checked_in_at: string;
          severity: number;
          sx_sneezing: boolean;
          sx_runny_nose: boolean;
          sx_nasal_congestion: boolean;
          sx_nasal_itch: boolean;
          sx_itchy_eyes: boolean;
          sx_watery_eyes: boolean;
          sx_red_eyes: boolean;
          sx_cough: boolean;
          sx_wheeze: boolean;
          sx_chest_tightness: boolean;
          sx_shortness_breath: boolean;
          sx_skin_rash: boolean;
          sx_hives: boolean;
          sx_eczema: boolean;
          sx_ear_fullness: boolean;
          sx_fatigue: boolean;
          sx_headache: boolean;
          sx_brain_fog: boolean;
          symptom_peak_time: SymptomPeakTime | null;
          mostly_indoors: boolean;
          pollen_upi_tree: number | null;
          pollen_upi_grass: number | null;
          pollen_upi_weed: number | null;
          aqi: number | null;
          humidity_pct: number | null;
          temp_f: number | null;
          wind_mph: number | null;
          wind_direction_deg: number | null;
          rain_last_12h: boolean;
          thunderstorm_6h: boolean;
          trigger_champion_id: string | null;
          final_four: string[] | null;
          leaderboard_json: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          child_id?: string | null;
          location_id?: string | null;
          is_travel?: boolean;
          checked_in_at?: string;
          severity?: number;
          sx_sneezing?: boolean;
          sx_runny_nose?: boolean;
          sx_nasal_congestion?: boolean;
          sx_nasal_itch?: boolean;
          sx_itchy_eyes?: boolean;
          sx_watery_eyes?: boolean;
          sx_red_eyes?: boolean;
          sx_cough?: boolean;
          sx_wheeze?: boolean;
          sx_chest_tightness?: boolean;
          sx_shortness_breath?: boolean;
          sx_skin_rash?: boolean;
          sx_hives?: boolean;
          sx_eczema?: boolean;
          sx_ear_fullness?: boolean;
          sx_fatigue?: boolean;
          sx_headache?: boolean;
          sx_brain_fog?: boolean;
          symptom_peak_time?: SymptomPeakTime | null;
          mostly_indoors?: boolean;
          pollen_upi_tree?: number | null;
          pollen_upi_grass?: number | null;
          pollen_upi_weed?: number | null;
          aqi?: number | null;
          humidity_pct?: number | null;
          temp_f?: number | null;
          wind_mph?: number | null;
          wind_direction_deg?: number | null;
          rain_last_12h?: boolean;
          thunderstorm_6h?: boolean;
          trigger_champion_id?: string | null;
          final_four?: string[] | null;
          leaderboard_json?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          child_id?: string | null;
          location_id?: string | null;
          is_travel?: boolean;
          checked_in_at?: string;
          severity?: number;
          sx_sneezing?: boolean;
          sx_runny_nose?: boolean;
          sx_nasal_congestion?: boolean;
          sx_nasal_itch?: boolean;
          sx_itchy_eyes?: boolean;
          sx_watery_eyes?: boolean;
          sx_red_eyes?: boolean;
          sx_cough?: boolean;
          sx_wheeze?: boolean;
          sx_chest_tightness?: boolean;
          sx_shortness_breath?: boolean;
          sx_skin_rash?: boolean;
          sx_hives?: boolean;
          sx_eczema?: boolean;
          sx_ear_fullness?: boolean;
          sx_fatigue?: boolean;
          sx_headache?: boolean;
          sx_brain_fog?: boolean;
          symptom_peak_time?: SymptomPeakTime | null;
          mostly_indoors?: boolean;
          pollen_upi_tree?: number | null;
          pollen_upi_grass?: number | null;
          pollen_upi_weed?: number | null;
          aqi?: number | null;
          humidity_pct?: number | null;
          temp_f?: number | null;
          wind_mph?: number | null;
          wind_direction_deg?: number | null;
          rain_last_12h?: boolean;
          thunderstorm_6h?: boolean;
          trigger_champion_id?: string | null;
          final_four?: string[] | null;
          leaderboard_json?: Json | null;
        };
      };

      trigger_scout_scans: {
        Row: {
          id: string;
          user_id: string;
          location_id: string | null;
          scanned_at: string;
          vision_label: string;
          vision_confidence: number | null;
          matched_allergen_id: string | null;
          match_method: MatchMethod | null;
          user_confirmed: boolean;
          confirmed_at: string | null;
          multiplier_active: boolean;
          multiplier_reason: MultiplierReason | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_id?: string | null;
          scanned_at?: string;
          vision_label: string;
          vision_confidence?: number | null;
          matched_allergen_id?: string | null;
          match_method?: MatchMethod | null;
          user_confirmed?: boolean;
          confirmed_at?: string | null;
          multiplier_active?: boolean;
          multiplier_reason?: MultiplierReason | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_id?: string | null;
          scanned_at?: string;
          vision_label?: string;
          vision_confidence?: number | null;
          matched_allergen_id?: string | null;
          match_method?: MatchMethod | null;
          user_confirmed?: boolean;
          confirmed_at?: string | null;
          multiplier_active?: boolean;
          multiplier_reason?: MultiplierReason | null;
        };
      };

      user_subscriptions: {
        Row: {
          user_id: string;
          tier: SubscriptionTier;
          platform: SubscriptionPlatform | null;
          expires_at: string | null;
          revenuecat_id: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tier?: SubscriptionTier;
          platform?: SubscriptionPlatform | null;
          expires_at?: string | null;
          revenuecat_id?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          tier?: SubscriptionTier;
          platform?: SubscriptionPlatform | null;
          expires_at?: string | null;
          revenuecat_id?: string | null;
          updated_at?: string;
        };
      };

      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          created_at?: string;
        };
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/* ------------------------------------------------------------------ */
/* Convenience aliases                                                 */
/* ------------------------------------------------------------------ */

type Tables = Database["public"]["Tables"];

export type UserProfile = Tables["user_profiles"]["Row"];
export type UserProfileInsert = Tables["user_profiles"]["Insert"];
export type UserProfileUpdate = Tables["user_profiles"]["Update"];

export type ChildProfile = Tables["child_profiles"]["Row"];
export type ChildProfileInsert = Tables["child_profiles"]["Insert"];
export type ChildProfileUpdate = Tables["child_profiles"]["Update"];

export type Allergen = Tables["allergens"]["Row"];
export type AllergenInsert = Tables["allergens"]["Insert"];
export type AllergenUpdate = Tables["allergens"]["Update"];

export type SeasonalCalendar = Tables["seasonal_calendar"]["Row"];
export type SeasonalCalendarInsert = Tables["seasonal_calendar"]["Insert"];
export type SeasonalCalendarUpdate = Tables["seasonal_calendar"]["Update"];

export type UserAllergenElo = Tables["user_allergen_elo"]["Row"];
export type UserAllergenEloInsert = Tables["user_allergen_elo"]["Insert"];
export type UserAllergenEloUpdate = Tables["user_allergen_elo"]["Update"];

export type UserLocation = Tables["user_locations"]["Row"];
export type UserLocationInsert = Tables["user_locations"]["Insert"];
export type UserLocationUpdate = Tables["user_locations"]["Update"];

export type SymptomCheckin = Tables["symptom_checkins"]["Row"];
export type SymptomCheckinInsert = Tables["symptom_checkins"]["Insert"];
export type SymptomCheckinUpdate = Tables["symptom_checkins"]["Update"];

export type TriggerScoutScan = Tables["trigger_scout_scans"]["Row"];
export type TriggerScoutScanInsert = Tables["trigger_scout_scans"]["Insert"];
export type TriggerScoutScanUpdate = Tables["trigger_scout_scans"]["Update"];

export type UserSubscription = Tables["user_subscriptions"]["Row"];
export type UserSubscriptionInsert = Tables["user_subscriptions"]["Insert"];
export type UserSubscriptionUpdate = Tables["user_subscriptions"]["Update"];

export type Referral = Tables["referrals"]["Row"];
export type ReferralInsert = Tables["referrals"]["Insert"];
export type ReferralUpdate = Tables["referrals"]["Update"];

/**
 * UserProfile with income_tier stripped out.
 * Use this type for any data leaving the server (API responses, SSR props).
 */
export type SafeUserProfile = Omit<UserProfile, "income_tier">;
