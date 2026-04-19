/**
 * Saved Places Types
 *
 * Type definitions for the saved places management feature.
 * Saved places are user_locations rows with is_home = false. Users create
 * them to track independent allergen exposure at recurring locations (e.g.
 * grandma's house, vacation home). Home location is managed by onboarding
 * and is NOT mutable through this API.
 */

export interface CreatePlaceInput {
  nickname: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  zip?: string | null;
  state?: string | null;
}

export interface UpdatePlaceInput {
  nickname?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  zip?: string | null;
  state?: string | null;
}

export interface SavedPlaceSummary {
  id: string;
  nickname: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  zip: string | null;
  state: string | null;
  last_visit: string | null;
  visit_count: number;
  created_at: string;
}
