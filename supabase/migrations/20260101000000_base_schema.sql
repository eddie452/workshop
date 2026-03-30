-- Base schema migration for Allergy Madness
--
-- This migration creates all tables that were originally set up via the
-- Supabase Dashboard / CLI but never captured as a migration file.
-- Supabase preview branches start from an empty database and only run
-- files in supabase/migrations/, so this file is required for preview
-- environments to work.
--
-- Source of truth: lib/supabase/types.ts (Database interface)
-- Ticket: #46 — Add base schema migration for Supabase preview branches
--
-- IMPORTANT: All statements use IF NOT EXISTS / IF NOT EXISTS guards so
-- this migration is safe to run against a production database that
-- already has these objects.

-- =====================================================================
-- Extensions
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. user_profiles
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name            TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  home_address            TEXT,
  home_lat                DOUBLE PRECISION,
  home_lng                DOUBLE PRECISION,
  home_zip                TEXT,
  home_state              TEXT,
  home_region             TEXT CHECK (home_region IN (
                            'Northeast', 'Midwest', 'Northwest',
                            'South Central', 'Southeast', 'Southwest'
                          )),
  home_year_built         INTEGER,
  home_type               TEXT CHECK (home_type IN (
                            'single_family', 'condo', 'apartment_low_rise',
                            'apartment_high_rise', 'townhouse', 'mobile', 'other'
                          )),
  home_sqft               INTEGER,
  home_construction       TEXT CHECK (home_construction IN (
                            'wood_frame', 'brick_old', 'brick_modern',
                            'concrete_highrise', 'modern_sealed', 'other'
                          )),
  ccrs                    INTEGER NOT NULL DEFAULT 0,
  has_pets                BOOLEAN NOT NULL DEFAULT FALSE,
  pet_types               TEXT[],
  has_mold_moisture       BOOLEAN NOT NULL DEFAULT FALSE,
  smoking_in_home         BOOLEAN NOT NULL DEFAULT FALSE,
  cockroach_sighting      BOOLEAN NOT NULL DEFAULT FALSE,
  prior_allergy_diagnosis BOOLEAN NOT NULL DEFAULT FALSE,
  known_allergens         TEXT[],
  seasonal_pattern        TEXT CHECK (seasonal_pattern IN (
                            'spring', 'summer', 'fall', 'year_round', 'unknown'
                          )),
  income_tier             INTEGER,
  neighborhood_ndvi       DOUBLE PRECISION
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_select_own' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY user_profiles_select_own ON user_profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Users can insert their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_insert_own' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY user_profiles_insert_own ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Users can update their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_update_own' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY user_profiles_update_own ON user_profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- =====================================================================
-- 2. child_profiles
-- =====================================================================

CREATE TABLE IF NOT EXISTS child_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id               UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  birth_year              INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_pets                BOOLEAN,
  prior_allergy_diagnosis BOOLEAN NOT NULL DEFAULT FALSE,
  known_allergens         TEXT[]
);

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'child_profiles_select_own' AND tablename = 'child_profiles'
  ) THEN
    CREATE POLICY child_profiles_select_own ON child_profiles
      FOR SELECT USING (auth.uid() = parent_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'child_profiles_insert_own' AND tablename = 'child_profiles'
  ) THEN
    CREATE POLICY child_profiles_insert_own ON child_profiles
      FOR INSERT WITH CHECK (auth.uid() = parent_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'child_profiles_update_own' AND tablename = 'child_profiles'
  ) THEN
    CREATE POLICY child_profiles_update_own ON child_profiles
      FOR UPDATE USING (auth.uid() = parent_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'child_profiles_delete_own' AND tablename = 'child_profiles'
  ) THEN
    CREATE POLICY child_profiles_delete_own ON child_profiles
      FOR DELETE USING (auth.uid() = parent_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_id ON child_profiles(parent_id);

-- =====================================================================
-- 3. allergens
-- =====================================================================

CREATE TABLE IF NOT EXISTS allergens (
  id                       TEXT PRIMARY KEY,
  common_name              TEXT NOT NULL,
  botanical_name           TEXT,
  iuis_designation         TEXT,
  category                 TEXT NOT NULL CHECK (category IN (
                             'tree', 'grass', 'weed', 'mold', 'indoor', 'food'
                           )),
  sub_category             TEXT,
  vision_labels            TEXT[],
  vision_min_confidence    REAL NOT NULL DEFAULT 0.0,
  particle_size_um_min     REAL,
  particle_size_um_max     REAL,
  settling_velocity_cm_s   REAL,
  spp_producer             BOOLEAN NOT NULL DEFAULT FALSE,
  spp_risk_level           TEXT CHECK (spp_risk_level IN (
                             'very_high', 'high', 'moderate', 'low', 'none'
                           )),
  lrt_capable              BOOLEAN NOT NULL DEFAULT FALSE,
  lrt_max_miles            REAL,
  lrt_source_regions       TEXT[],
  base_elo                 INTEGER NOT NULL DEFAULT 1500,
  region_northeast         REAL NOT NULL DEFAULT 1.0,
  region_midwest           REAL NOT NULL DEFAULT 1.0,
  region_northwest         REAL NOT NULL DEFAULT 1.0,
  region_south_central     REAL NOT NULL DEFAULT 1.0,
  region_southeast         REAL NOT NULL DEFAULT 1.0,
  region_southwest         REAL NOT NULL DEFAULT 1.0,
  cross_reactive_foods     TEXT[],
  pfas_severity            TEXT CHECK (pfas_severity IN (
                             'mild_oas', 'moderate', 'systemic_risk', 'none'
                           )),
  image_asset_path         TEXT,
  avoidance_tips           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;

-- Allergens are reference data — readable by all authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allergens_select_authenticated' AND tablename = 'allergens'
  ) THEN
    CREATE POLICY allergens_select_authenticated ON allergens
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_allergens_category ON allergens(category);

-- =====================================================================
-- 4. seasonal_calendar
-- =====================================================================

CREATE TABLE IF NOT EXISTS seasonal_calendar (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  allergen_id    TEXT NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  region         TEXT NOT NULL CHECK (region IN (
                   'Northeast', 'Midwest', 'Northwest',
                   'South Central', 'Southeast', 'Southwest'
                 )),
  month          INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  activity_level REAL NOT NULL DEFAULT 0.0
);

ALTER TABLE seasonal_calendar ENABLE ROW LEVEL SECURITY;

-- Reference data — readable by all authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'seasonal_calendar_select_authenticated' AND tablename = 'seasonal_calendar'
  ) THEN
    CREATE POLICY seasonal_calendar_select_authenticated ON seasonal_calendar
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seasonal_calendar_allergen_region
  ON seasonal_calendar(allergen_id, region);
CREATE INDEX IF NOT EXISTS idx_seasonal_calendar_month
  ON seasonal_calendar(month);

-- =====================================================================
-- 5. user_allergen_elo
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_allergen_elo (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  child_id         UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
  allergen_id      TEXT NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  location_id      UUID,
  elo_score        REAL NOT NULL DEFAULT 1500,
  positive_signals INTEGER NOT NULL DEFAULT 0,
  negative_signals INTEGER NOT NULL DEFAULT 0,
  last_updated     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_allergen_elo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_allergen_elo_select_own' AND tablename = 'user_allergen_elo'
  ) THEN
    CREATE POLICY user_allergen_elo_select_own ON user_allergen_elo
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_allergen_elo_insert_own' AND tablename = 'user_allergen_elo'
  ) THEN
    CREATE POLICY user_allergen_elo_insert_own ON user_allergen_elo
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_allergen_elo_update_own' AND tablename = 'user_allergen_elo'
  ) THEN
    CREATE POLICY user_allergen_elo_update_own ON user_allergen_elo
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_allergen_elo_user_id ON user_allergen_elo(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allergen_elo_allergen_id ON user_allergen_elo(allergen_id);
CREATE INDEX IF NOT EXISTS idx_user_allergen_elo_user_allergen
  ON user_allergen_elo(user_id, allergen_id);

-- =====================================================================
-- 6. user_locations
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_locations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  nickname             TEXT,
  is_home              BOOLEAN NOT NULL DEFAULT FALSE,
  address              TEXT,
  lat                  DOUBLE PRECISION,
  lng                  DOUBLE PRECISION,
  zip                  TEXT,
  state                TEXT,
  country_code         TEXT NOT NULL DEFAULT 'US',
  region               TEXT,
  ccrs                 INTEGER NOT NULL DEFAULT 0,
  year_built           INTEGER,
  home_type            TEXT,
  construction         TEXT,
  has_pets             BOOLEAN NOT NULL DEFAULT FALSE,
  pet_types            TEXT[],
  cockroach_sighting   BOOLEAN NOT NULL DEFAULT FALSE,
  intl_cockroach_tier  TEXT CHECK (intl_cockroach_tier IN (
                         'very_high', 'high', 'moderate', 'low', 'suppressed'
                       )),
  proximity_allergens  TEXT[],
  typical_visit_months INTEGER[],
  last_visit           TIMESTAMPTZ,
  visit_count          INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_locations_select_own' AND tablename = 'user_locations'
  ) THEN
    CREATE POLICY user_locations_select_own ON user_locations
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_locations_insert_own' AND tablename = 'user_locations'
  ) THEN
    CREATE POLICY user_locations_insert_own ON user_locations
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_locations_update_own' AND tablename = 'user_locations'
  ) THEN
    CREATE POLICY user_locations_update_own ON user_locations
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_locations_delete_own' AND tablename = 'user_locations'
  ) THEN
    CREATE POLICY user_locations_delete_own ON user_locations
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);

-- =====================================================================
-- 7. symptom_checkins
-- =====================================================================

CREATE TABLE IF NOT EXISTS symptom_checkins (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  child_id               UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
  location_id            UUID REFERENCES user_locations(id) ON DELETE SET NULL,
  is_travel              BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity               INTEGER NOT NULL DEFAULT 0,
  sx_sneezing            BOOLEAN NOT NULL DEFAULT FALSE,
  sx_runny_nose          BOOLEAN NOT NULL DEFAULT FALSE,
  sx_nasal_congestion    BOOLEAN NOT NULL DEFAULT FALSE,
  sx_nasal_itch          BOOLEAN NOT NULL DEFAULT FALSE,
  sx_itchy_eyes          BOOLEAN NOT NULL DEFAULT FALSE,
  sx_watery_eyes         BOOLEAN NOT NULL DEFAULT FALSE,
  sx_red_eyes            BOOLEAN NOT NULL DEFAULT FALSE,
  sx_cough               BOOLEAN NOT NULL DEFAULT FALSE,
  sx_wheeze              BOOLEAN NOT NULL DEFAULT FALSE,
  sx_chest_tightness     BOOLEAN NOT NULL DEFAULT FALSE,
  sx_shortness_breath    BOOLEAN NOT NULL DEFAULT FALSE,
  sx_skin_rash           BOOLEAN NOT NULL DEFAULT FALSE,
  sx_hives               BOOLEAN NOT NULL DEFAULT FALSE,
  sx_eczema              BOOLEAN NOT NULL DEFAULT FALSE,
  sx_ear_fullness        BOOLEAN NOT NULL DEFAULT FALSE,
  sx_fatigue             BOOLEAN NOT NULL DEFAULT FALSE,
  sx_headache            BOOLEAN NOT NULL DEFAULT FALSE,
  sx_brain_fog           BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_peak_time      TEXT CHECK (symptom_peak_time IN (
                           'morning', 'midday', 'evening', 'all_day'
                         )),
  mostly_indoors         BOOLEAN NOT NULL DEFAULT FALSE,
  pollen_upi_tree        REAL,
  pollen_upi_grass       REAL,
  pollen_upi_weed        REAL,
  aqi                    REAL,
  humidity_pct           REAL,
  temp_f                 REAL,
  wind_mph               REAL,
  wind_direction_deg     REAL,
  rain_last_12h          BOOLEAN NOT NULL DEFAULT FALSE,
  thunderstorm_6h        BOOLEAN NOT NULL DEFAULT FALSE,
  trigger_champion_id    TEXT REFERENCES allergens(id) ON DELETE SET NULL,
  final_four             TEXT[],
  leaderboard_json       JSONB
);

ALTER TABLE symptom_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'symptom_checkins_select_own' AND tablename = 'symptom_checkins'
  ) THEN
    CREATE POLICY symptom_checkins_select_own ON symptom_checkins
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'symptom_checkins_insert_own' AND tablename = 'symptom_checkins'
  ) THEN
    CREATE POLICY symptom_checkins_insert_own ON symptom_checkins
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'symptom_checkins_update_own' AND tablename = 'symptom_checkins'
  ) THEN
    CREATE POLICY symptom_checkins_update_own ON symptom_checkins
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_symptom_checkins_user_id ON symptom_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_symptom_checkins_checked_in_at ON symptom_checkins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_symptom_checkins_user_date
  ON symptom_checkins(user_id, checked_in_at);

-- =====================================================================
-- 8. trigger_scout_scans
-- =====================================================================

CREATE TABLE IF NOT EXISTS trigger_scout_scans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES user_locations(id) ON DELETE SET NULL,
  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vision_label        TEXT NOT NULL,
  vision_confidence   REAL,
  matched_allergen_id TEXT REFERENCES allergens(id) ON DELETE SET NULL,
  match_method        TEXT CHECK (match_method IN (
                        'exact', 'genus', 'fallback_shortlist', 'no_match'
                      )),
  user_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at        TIMESTAMPTZ,
  multiplier_active   BOOLEAN NOT NULL DEFAULT FALSE,
  multiplier_reason   TEXT CHECK (multiplier_reason IN (
                        'seasonal_calendar', 'api_confirmed', 'dormant'
                      ))
);

ALTER TABLE trigger_scout_scans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'trigger_scout_scans_select_own' AND tablename = 'trigger_scout_scans'
  ) THEN
    CREATE POLICY trigger_scout_scans_select_own ON trigger_scout_scans
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'trigger_scout_scans_insert_own' AND tablename = 'trigger_scout_scans'
  ) THEN
    CREATE POLICY trigger_scout_scans_insert_own ON trigger_scout_scans
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'trigger_scout_scans_update_own' AND tablename = 'trigger_scout_scans'
  ) THEN
    CREATE POLICY trigger_scout_scans_update_own ON trigger_scout_scans
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trigger_scout_scans_user_id ON trigger_scout_scans(user_id);

-- =====================================================================
-- 9. user_subscriptions
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id       UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL DEFAULT 'free' CHECK (tier IN (
                  'free', 'madness_plus', 'madness_family'
                )),
  platform      TEXT CHECK (platform IN (
                  'ios', 'android', 'stripe', 'none'
                )),
  expires_at    TIMESTAMPTZ,
  revenuecat_id TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_subscriptions_select_own' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY user_subscriptions_select_own ON user_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_subscriptions_insert_own' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY user_subscriptions_insert_own ON user_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_subscriptions_update_own' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY user_subscriptions_update_own ON user_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================================
-- Updated-at trigger function (shared)
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on user_profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Auto-update updated_at on user_subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_subscriptions_updated_at
      BEFORE UPDATE ON user_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
