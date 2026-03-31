/**
 * Tournament Engine Types
 *
 * Shared type definitions for the Elo scoring engine.
 * Server-side only — never import from client components.
 */

import type { Region } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Allergen data                                                       */
/* ------------------------------------------------------------------ */

/** Allergen record from seed data or database */
export interface Allergen {
  id: string;
  common_name: string;
  category: string;
  base_elo: number;
  region_northeast: number;
  region_midwest: number;
  region_northwest: number;
  region_south_central: number;
  region_southeast: number;
  region_southwest: number;
}

/* ------------------------------------------------------------------ */
/* Elo scoring                                                         */
/* ------------------------------------------------------------------ */

/** Per-user Elo record for a single allergen */
export interface AllergenElo {
  allergen_id: string;
  elo_score: number;
  positive_signals: number;
  negative_signals: number;
}

/** Result of an Elo update calculation */
export interface EloUpdate {
  allergen_id: string;
  new_elo: number;
  delta: number;
  k_factor: number;
}

/* ------------------------------------------------------------------ */
/* Seasonal calendar                                                   */
/* ------------------------------------------------------------------ */

export type Severity = "inactive" | "mild" | "moderate" | "severe";

export interface SeasonalEntry {
  allergen_id: string;
  region: Region;
  month: number;
  severity: Severity;
  activity_level: number;
}

export interface SeasonalMultiplierResult {
  allergen_id: string;
  severity: Severity;
  multiplier: number;
}

/* ------------------------------------------------------------------ */
/* Symptoms                                                            */
/* ------------------------------------------------------------------ */

/**
 * Symptom zones that map to allergen categories.
 * Each zone, when reported, boosts allergens with matching characteristics.
 */
export type SymptomZone =
  | "eyes"       // Itchy/watery eyes — tree/grass pollen
  | "nose"       // Sneezing/runny nose — most outdoor allergens
  | "throat"     // Throat irritation — mold, some pollen
  | "skin"       // Skin rash/hives — indoor allergens, food cross-reactivity
  | "lungs"      // Cough/wheeze — mold spores, SPP, indoor
  | "stomach";   // GI symptoms — food cross-reactivity (PFAS)

export interface SymptomInput {
  zones: SymptomZone[];
  /** Global severity 0-3 (0 = no symptoms, triggers symptom gate) */
  global_severity: number;
}

export interface SymptomMultiplierResult {
  allergen_id: string;
  multiplier: number;
  matching_zones: SymptomZone[];
}

/* ------------------------------------------------------------------ */
/* Confidence tiers                                                    */
/* ------------------------------------------------------------------ */

export type ConfidenceTier = "low" | "medium" | "high" | "very_high";

export interface ConfidenceResult {
  allergen_id: string;
  elo_score: number;
  tier: ConfidenceTier;
}

/* ------------------------------------------------------------------ */
/* CCRS (Cross-Reactivity Confidence Rating System)                    */
/* ------------------------------------------------------------------ */

/** Input for the 3-layer CCRS cockroach gate */
export interface CCRSInput {
  /** User's CCRS score (0-100, derived from home profile) */
  ccrs: number;
  /** Whether user reported a cockroach sighting */
  cockroach_sighting: boolean;
  /** Whether the check-in is mostly indoors */
  mostly_indoors: boolean;
  /** Global symptom severity (0-3) */
  global_severity: number;
}

/** Result of the CCRS gate check */
export interface CCRSResult {
  /** Whether the cockroach allergen passes the gate */
  passes: boolean;
  /** Which layer(s) failed, if any */
  failed_layers: string[];
  /** The CCRS multiplier to apply (0 if blocked, positive if passes) */
  multiplier: number;
}

/* ------------------------------------------------------------------ */
/* LRT (Long-Range Transport)                                          */
/* ------------------------------------------------------------------ */

/** Allergen data needed for LRT detection */
export interface LRTAllergenInput {
  allergen_id: string;
  /** Whether this allergen is capable of long-range transport */
  lrt_capable: boolean;
  /** Maximum transport distance in miles (null if not LRT-capable) */
  lrt_max_miles: number | null;
  /** Source regions for LRT (empty if not LRT-capable) */
  lrt_source_regions: string[];
}

/** Result of LRT detection for a single allergen */
export interface LRTResult {
  allergen_id: string;
  /** Whether LRT is detected for this allergen */
  lrt_detected: boolean;
  /** LRT multiplier (1.0 if no LRT, boosted if LRT detected) */
  multiplier: number;
}

/* ------------------------------------------------------------------ */
/* Tournament                                                          */
/* ------------------------------------------------------------------ */

/** Allergen with its composite score for tournament sorting */
export interface TournamentEntry {
  allergen_id: string;
  common_name: string;
  category: string;
  /** Final composite Elo score after all multipliers */
  composite_score: number;
  /** Confidence tier */
  tier: ConfidenceTier;
}

/** Result of the pairwise tournament sort */
export interface TournamentResult {
  /** Full ranked leaderboard (highest score first) */
  leaderboard: TournamentEntry[];
  /** Top 4 allergens (Final Four) */
  final_four: TournamentEntry[];
  /** Top 1 allergen (Trigger Champion) */
  trigger_champion: TournamentEntry | null;
}

/* ------------------------------------------------------------------ */
/* Run orchestrator                                                    */
/* ------------------------------------------------------------------ */

/** Full input for a tournament run */
export interface RunInput {
  /** Allergen seed data with physical properties */
  allergens: AllergenSeedData[];
  /** Current per-user Elo records */
  allergen_elos: AllergenElo[];
  /** Symptom input (zones + severity) */
  symptoms: SymptomInput;
  /** User's home region */
  region: Region;
  /** Current month (1-12) */
  month: number;
  /** User's CCRS profile data */
  ccrs_input: CCRSInput;
  /** Wind direction in degrees for LRT detection (null if unavailable) */
  wind_direction_deg: number | null;
  /** Environmental data for Monte Carlo */
  environment: {
    weather: import("@/lib/apis/weather").WeatherResult;
    pollen: import("@/lib/apis/pollen").PollenResult;
  };
  /** Active Trigger Scout proximity allergen IDs */
  trigger_scout_allergens: string[];
  /** RNG seed for reproducibility (optional) */
  seed?: number;
}

/** Extended allergen data needed by the run orchestrator */
export interface AllergenSeedData {
  id: string;
  common_name: string;
  category: string;
  base_elo: number;
  region_northeast: number;
  region_midwest: number;
  region_northwest: number;
  region_south_central: number;
  region_southeast: number;
  region_southwest: number;
  /** Mean particle size in micrometers */
  particle_size_um: number;
  /** Stokes' Law settling velocity in cm/s */
  settling_velocity_cm_s: number;
  /** Whether this allergen produces sub-pollen particles */
  spp_producer: boolean;
  /** Whether this allergen is capable of long-range transport */
  lrt_capable: boolean;
  /** Maximum transport distance in miles */
  lrt_max_miles: number | null;
  /** Source regions for LRT */
  lrt_source_regions: string[];
}

/** Output of a complete tournament run */
export interface RunOutput {
  /** Whether the symptom gate passed (false = Environmental Forecast mode) */
  symptom_gate_passed: boolean;
  /** Full tournament result (null if symptom gate failed) */
  tournament: TournamentResult | null;
  /** Per-allergen Elo updates to persist */
  elo_updates: EloUpdate[];
  /** Diagnostic step trace for debugging */
  step_trace: string[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Elo score bounds */
export const ELO_MIN = 100;
export const ELO_MAX = 3000;
export const ELO_CENTER = 1000;

/** Seasonal multiplier mapping */
export const SEASONAL_MULTIPLIER: Record<Severity, number> = {
  inactive: 0.0,
  mild: 1.2,
  moderate: 2.0,
  severe: 3.0,
};
