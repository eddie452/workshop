/**
 * PFAS (Pollen-Food Allergy Syndrome) Types
 *
 * Type definitions for the food cross-reactivity panel.
 * PFAS maps pollen allergens to cross-reactive foods that can
 * cause oral allergy symptoms in sensitized individuals.
 */

import type { PfasSeverity, AllergenCategory } from "@/lib/supabase/types";

/** A single allergen's cross-reactivity data */
export interface PfasCrossReactivity {
  /** Allergen ID from seed data */
  allergen_id: string;
  /** Human-readable allergen name */
  common_name: string;
  /** Allergen category (tree, weed, grass, etc.) */
  category: AllergenCategory;
  /** Foods that cross-react with this allergen */
  cross_reactive_foods: string[];
  /** Severity of PFAS reactions */
  pfas_severity: PfasSeverity;
}

/** Grouped PFAS data for display, organized by allergen */
export interface PfasPanelData {
  /** Allergens from the user's top 5 that have cross-reactive foods */
  entries: PfasCrossReactivity[];
  /** Whether any cross-reactive data exists for this user's top allergens */
  hasData: boolean;
}
