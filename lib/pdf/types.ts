/**
 * PDF Report Types
 *
 * Type definitions for the shareable allergen report PDF.
 * These types are server-side only — used by the PDF generation
 * utility and the API route.
 */

import type { ConfidenceTier } from "@/lib/engine/types";
import type { AllergenCategory } from "@/lib/supabase/types";

/** A ranked allergen entry for the PDF report */
export interface PdfAllergenEntry {
  rank: number;
  common_name: string;
  category: AllergenCategory;
  elo_score: number;
  confidence_tier: ConfidenceTier;
}

/** Input data for generating the PDF report */
export interface PdfReportInput {
  /** Child's display name (or "Your Child" if not set) */
  childName: string;
  /** Date the report was generated (ISO string) */
  generatedAt: string;
  /** User's home region, if available */
  region: string | null;
  /** Full ranked allergen list (highest score first) */
  allergens: PdfAllergenEntry[];
}
