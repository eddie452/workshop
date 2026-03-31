/**
 * Child Profiles Types
 *
 * Type definitions for the child profile management system.
 * Child profiles allow Family-tier parents to track up to 5 children
 * independently, each with their own Elo history and check-ins.
 */

export interface CreateChildInput {
  name: string;
  birth_year?: number | null;
  has_pets?: boolean | null;
  prior_allergy_diagnosis?: boolean;
  known_allergens?: string[] | null;
}

export interface UpdateChildInput {
  name?: string;
  birth_year?: number | null;
  has_pets?: boolean | null;
  prior_allergy_diagnosis?: boolean;
  known_allergens?: string[] | null;
}

export interface ChildProfileSummary {
  id: string;
  name: string;
  birth_year: number | null;
  created_at: string;
  has_pets: boolean | null;
  prior_allergy_diagnosis: boolean;
  known_allergens: string[] | null;
}

/** Maximum number of child profiles per parent */
export const MAX_CHILDREN = 5;
