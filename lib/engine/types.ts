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
