/**
 * PFAS Data Retrieval
 *
 * Extracts cross-reactive food data from the allergen seed data
 * for a user's top-ranked allergens. Data is NOT hardcoded — it
 * comes from the allergen seed JSON (cross_reactive_foods field).
 *
 * Server-side only — do not import from client components.
 */

import allergensSeed from "@/lib/data/allergens-seed.json";
import type { PfasCrossReactivity, PfasPanelData } from "./types";
import type { AllergenCategory, PfasSeverity } from "@/lib/supabase/types";

interface SeedAllergen {
  id: string;
  common_name: string;
  category: string;
  cross_reactive_foods: string[];
  pfas_severity: string;
}

/**
 * Get PFAS cross-reactivity data for a set of allergen IDs.
 *
 * Filters allergen seed data to only include allergens that:
 * 1. Are in the provided list (typically top 5 from leaderboard)
 * 2. Have non-empty cross_reactive_foods arrays
 * 3. Have a pfas_severity other than "none"
 *
 * @param allergenIds - Allergen IDs to check (typically top 5)
 * @returns PfasPanelData with matching entries
 */
export function getPfasData(allergenIds: string[]): PfasPanelData {
  const idSet = new Set(allergenIds);

  const entries: PfasCrossReactivity[] = (allergensSeed as SeedAllergen[])
    .filter(
      (a) =>
        idSet.has(a.id) &&
        a.cross_reactive_foods.length > 0 &&
        a.pfas_severity !== "none",
    )
    .map((a) => ({
      allergen_id: a.id,
      common_name: a.common_name,
      category: a.category as AllergenCategory,
      cross_reactive_foods: a.cross_reactive_foods,
      pfas_severity: a.pfas_severity as PfasSeverity,
    }));

  return {
    entries,
    hasData: entries.length > 0,
  };
}
