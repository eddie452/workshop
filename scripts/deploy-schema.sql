-- ============================================================
-- ALLERGY MADNESS — Supabase Database Schema v1.0
-- March 2026 | Standalone Consumer Application
-- ============================================================
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Execute
-- 4. Verify all 9 tables created with RLS enabled
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & PROFILES
-- ============================================================

CREATE TABLE user_profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Home location
  home_address          TEXT,
  home_lat              DECIMAL(9,6),
  home_lng              DECIMAL(9,6),
  home_zip              TEXT,
  home_state            TEXT,
  home_region           TEXT CHECK (home_region IN (
                          'Northeast','Midwest','Northwest',
                          'South Central','Southeast','Southwest')),

  -- Property data (BatchData API; user confirms at onboarding)
  home_year_built       INT,
  home_type             TEXT CHECK (home_type IN (
                          'single_family','condo','apartment_low_rise',
                          'apartment_high_rise','townhouse','mobile','other')),
  home_sqft             INT,
  home_construction     TEXT CHECK (home_construction IN (
                          'wood_frame','brick_old','brick_modern',
                          'concrete_highrise','modern_sealed','other')),

  -- Cockroach Climate Risk Score 0-100 (derived from home_state at onboarding)
  ccrs                  SMALLINT DEFAULT 0 CHECK (ccrs BETWEEN 0 AND 100),

  -- Indoor allergen context
  has_pets              BOOLEAN DEFAULT FALSE,
  pet_types             TEXT[],
  has_mold_moisture     BOOLEAN DEFAULT FALSE,
  smoking_in_home       BOOLEAN DEFAULT FALSE,
  cockroach_sighting    BOOLEAN DEFAULT FALSE,

  -- Onboarding questionnaire answers
  prior_allergy_diagnosis   BOOLEAN DEFAULT FALSE,
  known_allergens           TEXT[],
  seasonal_pattern          TEXT CHECK (seasonal_pattern IN (
                              'spring','summer','fall','year_round','unknown')),

  -- Census ACS income proxy (never displayed, never labeled as income)
  income_tier           SMALLINT CHECK (income_tier BETWEEN 1 AND 4),
  neighborhood_ndvi     DECIMAL(4,3)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON user_profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- CHILD PROFILES
-- ============================================================

CREATE TABLE child_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  birth_year      INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  has_pets        BOOLEAN,
  prior_allergy_diagnosis BOOLEAN DEFAULT FALSE,
  known_allergens TEXT[]
);

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_owns_children" ON child_profiles
  USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);

-- ============================================================
-- ALLERGEN MASTER TABLE
-- Sources: IUIS Allergen Nomenclature, Hollister-Stier calendars,
-- Computational Allergology paper (Stokes Law, UPI, pairwise model)
-- ============================================================

CREATE TABLE allergens (
  id                    TEXT PRIMARY KEY,
  common_name           TEXT NOT NULL,
  botanical_name        TEXT,
  iuis_designation      TEXT,
  category              TEXT NOT NULL CHECK (category IN (
                          'tree','grass','weed','mold','indoor','food')),
  sub_category          TEXT,

  -- Google Vision AI label synonyms for Trigger Scout matching
  vision_labels         TEXT[],
  vision_min_confidence DECIMAL(3,2) DEFAULT 0.70,

  -- Aerodynamic properties (Computational Allergology Section 2.1)
  particle_size_um_min  DECIMAL(6,2),
  particle_size_um_max  DECIMAL(6,2),
  settling_velocity_cm_s DECIMAL(6,3),
  spp_producer          BOOLEAN DEFAULT FALSE,
  spp_risk_level        TEXT CHECK (spp_risk_level IN (
                          'very_high','high','moderate','low','none')),

  -- Long-range transport
  lrt_capable           BOOLEAN DEFAULT FALSE,
  lrt_max_miles         INT,
  lrt_source_regions    TEXT[],

  -- Baseline Elo (scale 100-3000; 1000 = ~1% population prevalence)
  base_elo              INT DEFAULT 1000 CHECK (base_elo BETWEEN 100 AND 3000),

  -- Regional presence per Hollister-Stier (0=absent to 4=dominant)
  region_northeast      SMALLINT DEFAULT 0 CHECK (region_northeast BETWEEN 0 AND 4),
  region_midwest        SMALLINT DEFAULT 0 CHECK (region_midwest BETWEEN 0 AND 4),
  region_northwest      SMALLINT DEFAULT 0 CHECK (region_northwest BETWEEN 0 AND 4),
  region_south_central  SMALLINT DEFAULT 0 CHECK (region_south_central BETWEEN 0 AND 4),
  region_southeast      SMALLINT DEFAULT 0 CHECK (region_southeast BETWEEN 0 AND 4),
  region_southwest      SMALLINT DEFAULT 0 CHECK (region_southwest BETWEEN 0 AND 4),

  -- PFAS cross-reactivity
  cross_reactive_foods  TEXT[],
  pfas_severity         TEXT CHECK (pfas_severity IN (
                          'mild_oas','moderate','systemic_risk','none')),

  -- UI
  image_asset_path      TEXT,
  avoidance_tips        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allergens_public_read" ON allergens FOR SELECT USING (true);

-- ============================================================
-- SEASONAL CALENDAR
-- Hollister-Stier 6-region month-by-month activity data
-- activity_level maps to Elo multipliers:
--   0 = inactive  -> 0.0x (eliminated from tournament)
--   1 = mild      -> 1.2x
--   2 = moderate  -> 2.0x
--   3 = severe    -> 3.0x
-- ============================================================

CREATE TABLE seasonal_calendar (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  allergen_id   TEXT NOT NULL REFERENCES allergens(id),
  region        TEXT NOT NULL CHECK (region IN (
                  'Northeast','Midwest','Northwest',
                  'South Central','Southeast','Southwest')),
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  activity_level SMALLINT NOT NULL DEFAULT 0 CHECK (activity_level BETWEEN 0 AND 3),
  UNIQUE (allergen_id, region, month)
);

ALTER TABLE seasonal_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_public_read" ON seasonal_calendar FOR SELECT USING (true);

-- ============================================================
-- USER ALLERGEN ELO
-- ============================================================

CREATE TABLE user_allergen_elo (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
  allergen_id     TEXT NOT NULL REFERENCES allergens(id),
  location_id     UUID,  -- NULL = home location

  elo_score       INT NOT NULL DEFAULT 1000,
  positive_signals INT DEFAULT 0,
  negative_signals INT DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, allergen_id, location_id)
);

ALTER TABLE user_allergen_elo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_elo" ON user_allergen_elo
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- USER LOCATIONS (Home + Saved Places / Travel Mode)
-- ============================================================

CREATE TABLE user_locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  nickname        TEXT,
  is_home         BOOLEAN DEFAULT FALSE,
  address         TEXT,
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  zip             TEXT,
  state           TEXT,
  country_code    TEXT DEFAULT 'US',
  region          TEXT,
  ccrs            SMALLINT DEFAULT 0 CHECK (ccrs BETWEEN 0 AND 100),

  -- Indoor profile at this location
  year_built      INT,
  home_type       TEXT,
  construction    TEXT,
  has_pets        BOOLEAN DEFAULT FALSE,
  pet_types       TEXT[],
  cockroach_sighting BOOLEAN DEFAULT FALSE,
  intl_cockroach_tier TEXT CHECK (intl_cockroach_tier IN (
                    'very_high','high','moderate','low','suppressed')),

  -- Trigger Scout confirmed plants at this location
  proximity_allergens TEXT[],

  -- Visit history
  typical_visit_months INT[],
  last_visit      TIMESTAMPTZ,
  visit_count     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_locations" ON user_locations
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SYMPTOM CHECK-INS
-- ============================================================

CREATE TABLE symptom_checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES child_profiles(id),
  location_id     UUID REFERENCES user_locations(id),
  is_travel       BOOLEAN DEFAULT FALSE,
  checked_in_at   TIMESTAMPTZ DEFAULT NOW(),

  -- Global symptom gate: severity > 0 required for scoring
  severity        SMALLINT NOT NULL DEFAULT 0 CHECK (severity BETWEEN 0 AND 3),

  -- Upper respiratory
  sx_sneezing           BOOLEAN DEFAULT FALSE,
  sx_runny_nose         BOOLEAN DEFAULT FALSE,
  sx_nasal_congestion   BOOLEAN DEFAULT FALSE,
  sx_nasal_itch         BOOLEAN DEFAULT FALSE,

  -- Ocular
  sx_itchy_eyes         BOOLEAN DEFAULT FALSE,
  sx_watery_eyes        BOOLEAN DEFAULT FALSE,
  sx_red_eyes           BOOLEAN DEFAULT FALSE,

  -- Lower respiratory
  sx_cough              BOOLEAN DEFAULT FALSE,
  sx_wheeze             BOOLEAN DEFAULT FALSE,
  sx_chest_tightness    BOOLEAN DEFAULT FALSE,
  sx_shortness_breath   BOOLEAN DEFAULT FALSE,

  -- Dermal
  sx_skin_rash          BOOLEAN DEFAULT FALSE,
  sx_hives              BOOLEAN DEFAULT FALSE,
  sx_eczema             BOOLEAN DEFAULT FALSE,

  -- Ear
  sx_ear_fullness       BOOLEAN DEFAULT FALSE,

  -- Systemic
  sx_fatigue            BOOLEAN DEFAULT FALSE,
  sx_headache           BOOLEAN DEFAULT FALSE,
  sx_brain_fog          BOOLEAN DEFAULT FALSE,

  -- Timing and location
  symptom_peak_time     TEXT CHECK (symptom_peak_time IN (
                          'morning','midday','evening','all_day')),
  mostly_indoors        BOOLEAN DEFAULT TRUE,

  -- Environmental snapshot at check-in
  pollen_upi_tree       SMALLINT,
  pollen_upi_grass      SMALLINT,
  pollen_upi_weed       SMALLINT,
  aqi                   INT,
  humidity_pct          SMALLINT,
  temp_f                SMALLINT,
  wind_mph              SMALLINT,
  wind_direction_deg    SMALLINT,
  rain_last_12h         BOOLEAN DEFAULT FALSE,
  thunderstorm_6h       BOOLEAN DEFAULT FALSE,

  -- Tournament output
  trigger_champion_id   TEXT REFERENCES allergens(id),
  final_four            TEXT[],
  leaderboard_json      JSONB
);

ALTER TABLE symptom_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_checkins" ON symptom_checkins
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_checkins_user_time ON symptom_checkins (user_id, checked_in_at DESC);
CREATE INDEX idx_checkins_child     ON symptom_checkins (child_id, checked_in_at DESC);

-- ============================================================
-- TRIGGER SCOUT SCANS
-- ============================================================

CREATE TABLE trigger_scout_scans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_id           UUID REFERENCES user_locations(id),
  scanned_at            TIMESTAMPTZ DEFAULT NOW(),

  vision_label          TEXT NOT NULL,
  vision_confidence     DECIMAL(4,3),
  matched_allergen_id   TEXT REFERENCES allergens(id),
  match_method          TEXT CHECK (match_method IN (
                          'exact','genus','fallback_shortlist','no_match')),

  user_confirmed        BOOLEAN DEFAULT FALSE,
  confirmed_at          TIMESTAMPTZ,

  -- 2.5x Elo multiplier gating
  multiplier_active     BOOLEAN DEFAULT FALSE,
  multiplier_reason     TEXT CHECK (multiplier_reason IN (
                          'seasonal_calendar','api_confirmed','dormant'))
);

ALTER TABLE trigger_scout_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_scans" ON trigger_scout_scans
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SUBSCRIPTIONS (managed by RevenueCat webhooks)
-- ============================================================

CREATE TABLE user_subscriptions (
  user_id         UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  tier            TEXT DEFAULT 'free' CHECK (tier IN (
                    'free','madness_plus','madness_family')),
  platform        TEXT CHECK (platform IN ('ios','android','stripe','none')),
  expires_at      TIMESTAMPTZ,
  revenuecat_id   TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscription" ON user_subscriptions
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- END OF SCHEMA
-- Run in Supabase SQL Editor before workshop build begins
-- ============================================================
