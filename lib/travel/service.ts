/**
 * Travel Mode Service
 *
 * Server-side business logic for activating, deactivating, and reading
 * transient travel sessions. A travel session scopes a fresh set of
 * regional Elo records to a specific `user_locations.id` so the tournament
 * engine can re-rank allergens for the user's current physical location
 * WITHOUT corrupting the user's home Elo history.
 *
 * Ticket: #223 — Travel Mode API + schema
 * Parent Epic: #27 — Travel Mode + Saved Places
 *
 * Guardrails:
 * - Server-only: must NEVER be imported by a client component.
 * - Does not log lat/lng/address/PHI — uses opaque IDs only.
 * - Only one active session per user is allowed. The partial unique index
 *   on `travel_sessions(user_id) WHERE ended_at IS NULL` enforces this at
 *   the DB level; we surface a 409 on violation.
 * - NEVER deletes or updates `user_allergen_elo` rows with the home
 *   `location_id` (or NULL). Travel re-seed only INSERTs new rows scoped
 *   to the travel location_id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  UserAllergenEloInsert,
  Region,
} from "@/lib/supabase/types";
import { getRegionFromState } from "@/lib/onboarding";
import { initializeAllElo } from "@/lib/engine/elo";
import allergenSeed from "@/lib/data/allergens-seed.json";
import type { Allergen } from "@/lib/engine/types";
import { logger } from "@/lib/logger";

type SupabaseDB = SupabaseClient<Database>;

/** Nearest-match radius for reusing an existing user_locations row. ~1km. */
const NEAREST_MATCH_DEGREES = 0.01;

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export interface ActivateTravelInput {
  lat: number;
  lng: number;
  nickname?: string;
  /** Optional state abbreviation used to seed regional allergens. */
  state?: string;
}

export interface TravelSessionSummary {
  id: string;
  location_id: string;
  started_at: string;
}

export type ActivateResult =
  | { success: true; session: TravelSessionSummary }
  | {
      success: false;
      error: string;
      code:
        | "active_session_exists"
        | "location_failed"
        | "session_failed"
        | "elo_seed_failed"
        | "validation";
    };

export type DeactivateResult =
  | { success: true; session: TravelSessionSummary }
  | { success: false; error: string; code: "no_active_session" | "update_failed" };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Find the nearest non-home user_locations row within ~1km, or create one.
 * We intentionally never log lat/lng here — only the resulting opaque id.
 */
async function findOrCreateTravelLocation(
  supabase: SupabaseDB,
  userId: string,
  input: ActivateTravelInput,
): Promise<{ id: string; region: Region | null } | null> {
  const { lat, lng } = input;

  // Look for an existing non-home location close to the given coords.
  const { data: candidates, error: lookupError } = await supabase
    .from("user_locations")
    .select("id, lat, lng, region, state")
    .eq("user_id", userId)
    .eq("is_home", false);

  if (lookupError) {
    logger.error("Travel location lookup failed", { user_id_hash: userId });
    return null;
  }

  type LocationRow = {
    id: string;
    lat: number | null;
    lng: number | null;
    region: string | null;
    state: string | null;
  };
  const rows = (candidates ?? []) as unknown as LocationRow[];

  for (const row of rows) {
    if (
      row.lat !== null &&
      row.lng !== null &&
      Math.abs(row.lat - lat) < NEAREST_MATCH_DEGREES &&
      Math.abs(row.lng - lng) < NEAREST_MATCH_DEGREES
    ) {
      return { id: row.id, region: (row.region ?? null) as Region | null };
    }
  }

  // No nearby match — insert a new non-home location row.
  const derivedRegion = getRegionFromState(input.state ?? null);
  type LocationInsertChain = {
    insert: (data: {
      user_id: string;
      is_home: boolean;
      nickname: string | null;
      lat: number;
      lng: number;
      state: string | null;
      region: string | null;
    }) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string; region: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const insertResult = await (
    supabase.from("user_locations") as unknown as LocationInsertChain
  )
    .insert({
      user_id: userId,
      is_home: false,
      nickname: input.nickname?.trim() || null,
      lat,
      lng,
      state: input.state ?? null,
      region: derivedRegion,
    })
    .select("id, region")
    .single();

  if (insertResult.error || !insertResult.data) {
    logger.error("Travel location insert failed", {
      user_id_hash: userId,
      reason: insertResult.error?.message ?? "unknown",
    });
    return null;
  }

  return {
    id: insertResult.data.id,
    region: (insertResult.data.region ?? derivedRegion) as Region | null,
  };
}

/**
 * Seed user_allergen_elo rows for a travel location. INSERT-only — never
 * touches rows scoped to home (home_location_id or NULL).
 */
async function seedTravelElo(
  supabase: SupabaseDB,
  userId: string,
  locationId: string,
  region: Region,
): Promise<boolean> {
  const regionField = `region_${region
    .toLowerCase()
    .replaceAll(" ", "_")}` as keyof (typeof allergenSeed)[0];

  const regionalAllergens = allergenSeed.filter(
    (a) => (a[regionField] as number) > 0,
  );

  const allergenData: Allergen[] = regionalAllergens.map((a) => ({
    id: a.id,
    common_name: a.common_name,
    category: a.category,
    base_elo: a.base_elo,
    region_northeast: a.region_northeast,
    region_midwest: a.region_midwest,
    region_northwest: a.region_northwest,
    region_south_central: a.region_south_central,
    region_southeast: a.region_southeast,
    region_southwest: a.region_southwest,
  }));

  const eloRecords = initializeAllElo(allergenData, region);

  const eloInserts: UserAllergenEloInsert[] = eloRecords.map((elo) => ({
    user_id: userId,
    allergen_id: elo.allergen_id,
    location_id: locationId,
    elo_score: elo.elo_score,
    positive_signals: 0,
    negative_signals: 0,
  }));

  if (eloInserts.length === 0) return true;

  type InsertQuery = {
    insert: (
      data: UserAllergenEloInsert[],
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await (
    supabase.from("user_allergen_elo") as unknown as InsertQuery
  ).insert(eloInserts);

  if (error) {
    logger.error("Travel Elo seeding failed", {
      user_id_hash: userId,
      reason: error.message,
    });
    return false;
  }

  return true;
}

/* ------------------------------------------------------------------ */
/* Service functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Return the current active travel session for the user (ended_at IS NULL),
 * or null if none.
 */
export async function getActiveSession(
  supabase: SupabaseDB,
  userId: string,
): Promise<TravelSessionSummary | null> {
  type SelectChain = {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          maybeSingle: () => Promise<{
            data: TravelSessionSummary | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const { data, error } = await (
    supabase.from("travel_sessions") as unknown as SelectChain
  )
    .select("id, location_id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    logger.warn("Active session lookup failed", {
      user_id_hash: userId,
      reason: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Activate travel mode: find-or-create a non-home user_locations row,
 * insert a travel_sessions row, seed location-scoped Elo.
 */
export async function activateTravel(
  supabase: SupabaseDB,
  userId: string,
  input: ActivateTravelInput,
): Promise<ActivateResult> {
  if (!isValidLatLng(input.lat, input.lng)) {
    return {
      success: false,
      error: "Invalid coordinates",
      code: "validation",
    };
  }

  // Resolve / create the travel location row.
  const loc = await findOrCreateTravelLocation(supabase, userId, input);
  if (!loc) {
    return {
      success: false,
      error: "Failed to resolve travel location",
      code: "location_failed",
    };
  }

  // Insert travel_sessions row.
  type SessionInsertChain = {
    insert: (data: {
      user_id: string;
      location_id: string;
    }) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: TravelSessionSummary | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
  };

  const insertResult = await (
    supabase.from("travel_sessions") as unknown as SessionInsertChain
  )
    .insert({ user_id: userId, location_id: loc.id })
    .select("id, location_id, started_at")
    .single();

  if (insertResult.error || !insertResult.data) {
    const msg = insertResult.error?.message ?? "unknown";
    // Partial unique index violation → active session already exists.
    const isUniqueViolation =
      insertResult.error?.code === "23505" ||
      msg.toLowerCase().includes("duplicate") ||
      msg.toLowerCase().includes("unique");
    if (isUniqueViolation) {
      return {
        success: false,
        error: "An active travel session already exists",
        code: "active_session_exists",
      };
    }
    logger.error("Travel session insert failed", {
      user_id_hash: userId,
      reason: msg,
    });
    return {
      success: false,
      error: "Failed to start travel session",
      code: "session_failed",
    };
  }

  // Seed regional Elo scoped to the travel location. If this fails, we
  // MUST compensate by deleting the session row just inserted — otherwise
  // the user is left with an active travel session and no travel Elo rows,
  // which breaks the dashboard mid-trip (issue #236).
  //
  // Option A (Postgres RPC transaction) was considered but rejected: the
  // Elo seeding pipeline lives in TypeScript (regional allergen filter +
  // `initializeAllElo`) and porting it to plpgsql would duplicate the
  // deterministic initializer. Option B — compensating delete — keeps the
  // TS pipeline authoritative and achieves the atomicity guarantee at the
  // service layer.
  const region: Region = loc.region ?? "Southeast";
  const seeded = await seedTravelElo(supabase, userId, loc.id, region);

  if (!seeded) {
    // Compensating rollback: delete the session row so the user is not
    // left in a half-activated state. We scope by id to avoid touching
    // any unrelated session.
    type DeleteChain = {
      delete: () => {
        eq: (col: string, val: string) => Promise<{
          error: { message: string } | null;
        }>;
      };
    };

    const sessionId = insertResult.data.id;
    const { error: rollbackError } = await (
      supabase.from("travel_sessions") as unknown as DeleteChain
    )
      .delete()
      .eq("id", sessionId);

    if (rollbackError) {
      // Compensating delete itself failed — surface loudly. The user now
      // truly is in a broken state; operators must clean up manually.
      logger.error("Travel session rollback failed after Elo seed failure", {
        user_id_hash: userId,
        reason: rollbackError.message,
      });
    }

    return {
      success: false,
      error: "Failed to seed travel allergen rankings",
      code: "elo_seed_failed",
    };
  }

  return { success: true, session: insertResult.data };
}

/**
 * Deactivate the user's active travel session by setting ended_at = NOW().
 * Home Elo is untouched — travel-scoped Elo rows remain for history but
 * no longer feed the "active" location lookup.
 */
export async function deactivateTravel(
  supabase: SupabaseDB,
  userId: string,
): Promise<DeactivateResult> {
  const active = await getActiveSession(supabase, userId);
  if (!active) {
    return {
      success: false,
      error: "No active travel session",
      code: "no_active_session",
    };
  }

  type UpdateChain = {
    update: (data: { ended_at: string }) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => Promise<{
          error: { message: string } | null;
        }>;
      };
    };
  };

  const endedAt = new Date().toISOString();

  const { error } = await (
    supabase.from("travel_sessions") as unknown as UpdateChain
  )
    .update({ ended_at: endedAt })
    .eq("user_id", userId)
    .is("ended_at", null);

  if (error) {
    logger.error("Travel session deactivation failed", {
      user_id_hash: userId,
      reason: error.message,
    });
    return {
      success: false,
      error: "Failed to end travel session",
      code: "update_failed",
    };
  }

  return {
    success: true,
    session: { ...active, started_at: active.started_at },
  };
}
