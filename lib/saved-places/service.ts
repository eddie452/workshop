/**
 * Saved Places Service
 *
 * Server-side business logic for CRUD on saved (non-home) user_locations rows.
 *
 * Key invariants:
 *  - Only rows where `is_home = false` are ever returned or mutated.
 *  - The API NEVER allows a caller to create/update/delete a home row.
 *    Attempts to mutate a row with `is_home = true` return a typed
 *    `{ success: false, error: "home_row_forbidden" }` result, which the
 *    route handler translates to HTTP 403.
 *  - RLS on `user_locations` already scopes all reads/writes to
 *    `auth.uid() = user_id`; this service still filters by `user_id` as
 *    defense-in-depth.
 *  - `user_allergen_elo` is NOT seeded here — that work is tracked
 *    separately per ticket #225.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  UserLocationInsert,
  UserLocationUpdate,
} from "@/lib/supabase/types";
import type {
  CreatePlaceInput,
  UpdatePlaceInput,
  SavedPlaceSummary,
} from "./types";

type SupabaseDB = SupabaseClient<Database>;

const PLACE_SELECT =
  "id, nickname, address, lat, lng, zip, state, last_visit, visit_count, created_at";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validateNickname(nickname: string | undefined): string | null {
  if (nickname === undefined) {
    return null;
  }
  const trimmed = nickname.trim();
  if (trimmed.length === 0) {
    return "Nickname is required";
  }
  if (trimmed.length > 100) {
    return "Nickname must be 100 characters or less";
  }
  return null;
}

function validateLatLng(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat !== null && lat !== undefined) {
    if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90) {
      return "Invalid latitude";
    }
  }
  if (lng !== null && lng !== undefined) {
    if (typeof lng !== "number" || Number.isNaN(lng) || lng < -180 || lng > 180) {
      return "Invalid longitude";
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Service functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * List all saved (non-home) places for a user.
 */
export async function listPlaces(
  supabase: SupabaseDB,
  userId: string,
): Promise<SavedPlaceSummary[]> {
  const { data, error } = await supabase
    .from("user_locations")
    .select(PLACE_SELECT)
    .eq("user_id", userId)
    .eq("is_home", false)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list saved places: ${error.message}`);
  }

  return (data ?? []) as unknown as SavedPlaceSummary[];
}

/**
 * Create a new saved place. Always inserts with `is_home = false` — any
 * `is_home` value on the input is ignored.
 */
export async function createPlace(
  supabase: SupabaseDB,
  userId: string,
  input: CreatePlaceInput,
): Promise<
  | { success: true; place: SavedPlaceSummary }
  | { success: false; error: string }
> {
  const nicknameError = validateNickname(input.nickname);
  if (nicknameError) {
    return { success: false, error: nicknameError };
  }

  const latLngError = validateLatLng(input.lat, input.lng);
  if (latLngError) {
    return { success: false, error: latLngError };
  }

  const insertData: UserLocationInsert = {
    user_id: userId,
    nickname: input.nickname.trim(),
    is_home: false,
    address: input.address ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    zip: input.zip ?? null,
    state: input.state ?? null,
  };

  const { data, error } = await (
    supabase.from("user_locations") as unknown as {
      insert: (row: UserLocationInsert) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: SavedPlaceSummary | null;
            error: { message: string } | null;
          }>;
        };
      };
    }
  )
    .insert(insertData)
    .select(PLACE_SELECT)
    .single();

  if (error || !data) {
    return {
      success: false,
      error: `Failed to create saved place: ${error?.message ?? "unknown error"}`,
    };
  }

  return { success: true, place: data };
}

/**
 * Fetch a place owned by the user. Returns null when the row is missing.
 * Used by the route handler to detect home-row mutation attempts before
 * performing the update/delete.
 */
export async function getPlaceForOwner(
  supabase: SupabaseDB,
  placeId: string,
  userId: string,
): Promise<{ id: string; is_home: boolean } | null> {
  const { data, error } = await (
    supabase.from("user_locations") as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: { id: string; is_home: boolean } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .select("id, is_home")
    .eq("id", placeId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

/**
 * Update an existing saved place. Refuses to mutate home rows.
 * `is_home` cannot be flipped through this API — any attempt is ignored.
 */
export async function updatePlace(
  supabase: SupabaseDB,
  placeId: string,
  userId: string,
  input: UpdatePlaceInput,
): Promise<
  | { success: true }
  | { success: false; error: string; status?: number }
> {
  const existing = await getPlaceForOwner(supabase, placeId, userId);
  if (!existing) {
    return { success: false, error: "Saved place not found", status: 404 };
  }
  if (existing.is_home) {
    return {
      success: false,
      error: "Home location cannot be modified through this API",
      status: 403,
    };
  }

  const nicknameError = validateNickname(input.nickname);
  if (nicknameError) {
    return { success: false, error: nicknameError };
  }

  const latLngError = validateLatLng(input.lat, input.lng);
  if (latLngError) {
    return { success: false, error: latLngError };
  }

  const updateData: UserLocationUpdate = {};
  if (input.nickname !== undefined) updateData.nickname = input.nickname.trim();
  if (input.address !== undefined) updateData.address = input.address;
  if (input.lat !== undefined) updateData.lat = input.lat;
  if (input.lng !== undefined) updateData.lng = input.lng;
  if (input.zip !== undefined) updateData.zip = input.zip;
  if (input.state !== undefined) updateData.state = input.state;

  const { error } = await (
    supabase.from("user_locations") as unknown as {
      update: (row: UserLocationUpdate) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: boolean) => Promise<{
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .update(updateData)
    .eq("id", placeId)
    .eq("user_id", userId)
    .eq("is_home", false);

  if (error) {
    return {
      success: false,
      error: `Failed to update saved place: ${error.message}`,
    };
  }
  return { success: true };
}

/**
 * Delete a saved place. Refuses to delete home rows.
 */
export async function deletePlace(
  supabase: SupabaseDB,
  placeId: string,
  userId: string,
): Promise<
  | { success: true }
  | { success: false; error: string; status?: number }
> {
  const existing = await getPlaceForOwner(supabase, placeId, userId);
  if (!existing) {
    return { success: false, error: "Saved place not found", status: 404 };
  }
  if (existing.is_home) {
    return {
      success: false,
      error: "Home location cannot be deleted through this API",
      status: 403,
    };
  }

  const { error } = await (
    supabase.from("user_locations") as unknown as {
      delete: () => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: boolean) => Promise<{
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .delete()
    .eq("id", placeId)
    .eq("user_id", userId)
    .eq("is_home", false);

  if (error) {
    return {
      success: false,
      error: `Failed to delete saved place: ${error.message}`,
    };
  }
  return { success: true };
}
