/**
 * Onboarding Component Types
 *
 * Shared types for the multi-step onboarding wizard.
 */

import type { SeasonalPattern, HomeType } from "@/lib/supabase/types";

/** All data collected during onboarding */
export interface OnboardingFormData {
  /** Step 1: Address */
  address: string;

  /** Step 2: Home details (may be auto-populated from BatchData) */
  home_type: HomeType | null;
  year_built: number | null;
  sqft: number | null;

  /** Step 3: User questions */
  has_pets: boolean;
  pet_types: string[];
  prior_allergy_diagnosis: boolean;
  known_allergens: string[];
  seasonal_pattern: SeasonalPattern;
  cockroach_sighting: boolean;
  has_mold_moisture: boolean;
  smoking_in_home: boolean;
}

/** Props passed to each wizard step component */
export interface StepProps {
  formData: OnboardingFormData;
  onUpdate: (updates: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Wizard step identifiers */
export type OnboardingStep =
  | "address"
  | "home-details"
  | "health-questions"
  | "confirmation"
  | "processing";

/** Initial form data with sensible defaults */
export const INITIAL_FORM_DATA: OnboardingFormData = {
  address: "",
  home_type: null,
  year_built: null,
  sqft: null,
  has_pets: false,
  pet_types: [],
  prior_allergy_diagnosis: false,
  known_allergens: [],
  seasonal_pattern: "unknown",
  cockroach_sighting: false,
  has_mold_moisture: false,
  smoking_in_home: false,
};
