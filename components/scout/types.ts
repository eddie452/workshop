/**
 * Trigger Scout Component Types
 *
 * Shared types for the Trigger Scout camera/upload UI.
 */

/** A single match result from the API */
export interface ScanMatchResult {
  allergen_id: string;
  common_name: string;
  category: string;
  matched_label: string;
  confidence: number;
  status: "active" | "dormant";
}

/** API response from POST /api/trigger-scout/scan */
export interface ScanResponse {
  success: true;
  scan_id: string;
  matches: ScanMatchResult[];
  active_count: number;
  dormant_count: number;
  proximity_multiplier: number;
}

/** API error response */
export interface ScanErrorResponse {
  success: false;
  error: string;
}
