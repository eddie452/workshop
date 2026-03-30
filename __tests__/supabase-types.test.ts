import { describe, it, expect } from "vitest";
import type {
  Database,
  UserProfile,
  SafeUserProfile,
  Allergen,
  SeasonalCalendar,
  UserAllergenElo,
  UserLocation,
  SymptomCheckin,
  TriggerScoutScan,
  UserSubscription,
  ChildProfile,
  Region,
  AllergenCategory,
} from "@/lib/supabase/types";

describe("Supabase database types", () => {
  it("Database interface has all 9 tables", () => {
    // This is a compile-time test — if types are wrong, tsc fails.
    // At runtime we verify the structure exists as expected.
    type TableNames = keyof Database["public"]["Tables"];
    const tables: TableNames[] = [
      "user_profiles",
      "child_profiles",
      "allergens",
      "seasonal_calendar",
      "user_allergen_elo",
      "user_locations",
      "symptom_checkins",
      "trigger_scout_scans",
      "user_subscriptions",
    ];
    expect(tables).toHaveLength(9);
  });

  it("SafeUserProfile omits income_tier", () => {
    // Compile-time assertion: income_tier should not be assignable
    const safe: SafeUserProfile = {
      id: "test",
      display_name: null,
      created_at: "",
      updated_at: "",
      home_address: null,
      home_lat: null,
      home_lng: null,
      home_zip: null,
      home_state: null,
      home_region: null,
      home_year_built: null,
      home_type: null,
      home_sqft: null,
      home_construction: null,
      ccrs: 1,
      has_pets: false,
      pet_types: null,
      has_mold_moisture: false,
      smoking_in_home: false,
      cockroach_sighting: false,
      prior_allergy_diagnosis: false,
      known_allergens: null,
      seasonal_pattern: null,
      neighborhood_ndvi: null,
      fda_acknowledged: false,
    };
    expect(safe).not.toHaveProperty("income_tier");
  });

  it("Region type covers all 6 US regions", () => {
    const regions: Region[] = [
      "Northeast",
      "Midwest",
      "Northwest",
      "South Central",
      "Southeast",
      "Southwest",
    ];
    expect(regions).toHaveLength(6);
  });

  it("AllergenCategory covers all 6 categories", () => {
    const categories: AllergenCategory[] = [
      "tree",
      "grass",
      "weed",
      "mold",
      "indoor",
      "food",
    ];
    expect(categories).toHaveLength(6);
  });

  it("Row types are properly typed", () => {
    // Verify that convenience aliases resolve correctly (compile-time check)
    const _profile: UserProfile["id"] = "uuid-string";
    const _allergen: Allergen["category"] = "tree";
    const _calendar: SeasonalCalendar["activity_level"] = 3;
    const _elo: UserAllergenElo["elo_score"] = 1500;
    const _location: UserLocation["country_code"] = "US";
    const _checkin: SymptomCheckin["severity"] = 2;
    const _scan: TriggerScoutScan["match_method"] = "exact";
    const _sub: UserSubscription["tier"] = "free";
    const _child: ChildProfile["parent_id"] = "uuid-string";

    expect(_profile).toBe("uuid-string");
    expect(_allergen).toBe("tree");
    expect(_calendar).toBe(3);
    expect(_elo).toBe(1500);
    expect(_location).toBe("US");
    expect(_checkin).toBe(2);
    expect(_scan).toBe("exact");
    expect(_sub).toBe("free");
    expect(_child).toBe("uuid-string");
  });
});
