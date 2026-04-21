/**
 * Travel Mode Service Tests
 *
 * Tests business logic for activating / deactivating travel sessions and
 * the guardrail that home Elo rows must not be modified.
 */

import { describe, it, expect, vi } from "vitest";
import {
  activateTravel,
  deactivateTravel,
  getActiveSession,
} from "@/lib/travel/service";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Mock client helpers                                                 */
/* ------------------------------------------------------------------ */

interface TableState {
  user_locations: Array<{
    id: string;
    user_id: string;
    is_home: boolean;
    lat: number | null;
    lng: number | null;
    region: string | null;
    state: string | null;
  }>;
  travel_sessions: Array<{
    id: string;
    user_id: string;
    location_id: string;
    started_at: string;
    ended_at: string | null;
  }>;
  user_allergen_elo: Array<{
    id: string;
    user_id: string;
    allergen_id: string;
    location_id: string | null;
    elo_score: number;
  }>;
}

/**
 * A minimal in-memory Supabase stub that supports the exact chain shapes
 * used by `lib/travel/service.ts`. Unsupported chains throw loudly.
 */
interface StubOptions {
  /** Force user_allergen_elo.insert to fail with this error message. */
  failEloInsert?: string;
  /** Force travel_sessions.delete to fail (compensating rollback path). */
  failSessionDelete?: string;
}

function makeStub(state: TableState, options: StubOptions = {}) {
  let idCounter = 1;
  function nextId() {
    return `id-${idCounter++}`;
  }

  function fromUserLocations() {
    return {
      // .select("...").eq("user_id", id).eq("is_home", false)
      select: (_cols: string) => ({
        eq: (col1: string, val1: string) => ({
          eq: (col2: string, val2: unknown) => {
            const rows = state.user_locations.filter(
              (r) =>
                (r as unknown as Record<string, unknown>)[col1] === val1 &&
                (r as unknown as Record<string, unknown>)[col2] === val2,
            );
            return Promise.resolve({ data: rows, error: null });
          },
        }),
      }),
      insert: (data: {
        user_id: string;
        is_home: boolean;
        lat: number;
        lng: number;
        region: string | null;
        state: string | null;
        nickname: string | null;
      }) => ({
        select: (_cols: string) => ({
          single: () => {
            const row = {
              id: nextId(),
              user_id: data.user_id,
              is_home: data.is_home,
              lat: data.lat,
              lng: data.lng,
              region: data.region,
              state: data.state,
            };
            state.user_locations.push(row);
            return Promise.resolve({
              data: { id: row.id, region: row.region },
              error: null,
            });
          },
        }),
      }),
    };
  }

  function fromTravelSessions() {
    return {
      select: (_cols: string) => ({
        eq: (_col1: string, val1: string) => ({
          is: (_col2: string, _val2: null) => ({
            maybeSingle: () => {
              const row = state.travel_sessions.find(
                (r) => r.user_id === val1 && r.ended_at === null,
              );
              return Promise.resolve({
                data: row
                  ? {
                      id: row.id,
                      location_id: row.location_id,
                      started_at: row.started_at,
                    }
                  : null,
                error: null,
              });
            },
          }),
        }),
      }),
      insert: (data: { user_id: string; location_id: string }) => ({
        select: (_cols: string) => ({
          single: () => {
            // Enforce partial unique index semantics.
            const hasActive = state.travel_sessions.some(
              (r) => r.user_id === data.user_id && r.ended_at === null,
            );
            if (hasActive) {
              return Promise.resolve({
                data: null,
                error: {
                  message: "duplicate key value violates unique constraint",
                  code: "23505",
                },
              });
            }
            const row = {
              id: nextId(),
              user_id: data.user_id,
              location_id: data.location_id,
              started_at: new Date().toISOString(),
              ended_at: null,
            };
            state.travel_sessions.push(row);
            return Promise.resolve({
              data: {
                id: row.id,
                location_id: row.location_id,
                started_at: row.started_at,
              },
              error: null,
            });
          },
        }),
      }),
      update: (data: { ended_at: string }) => ({
        eq: (_col1: string, val1: string) => ({
          is: (_col2: string, _val2: null) => {
            const row = state.travel_sessions.find(
              (r) => r.user_id === val1 && r.ended_at === null,
            );
            if (row) row.ended_at = data.ended_at;
            return Promise.resolve({ error: null });
          },
        }),
      }),
      delete: () => ({
        eq: (col: string, val: string) => {
          if (options.failSessionDelete) {
            return Promise.resolve({
              error: { message: options.failSessionDelete },
            });
          }
          const idx = state.travel_sessions.findIndex(
            (r) =>
              (r as unknown as Record<string, unknown>)[col] === val,
          );
          if (idx >= 0) state.travel_sessions.splice(idx, 1);
          return Promise.resolve({ error: null });
        },
      }),
    };
  }

  function fromUserAllergenElo() {
    return {
      insert: (rows: Array<{
        user_id: string;
        allergen_id: string;
        location_id: string | null;
        elo_score: number;
      }>) => {
        if (options.failEloInsert) {
          return Promise.resolve({
            error: { message: options.failEloInsert },
          });
        }
        for (const r of rows) {
          state.user_allergen_elo.push({
            id: nextId(),
            user_id: r.user_id,
            allergen_id: r.allergen_id,
            location_id: r.location_id,
            elo_score: r.elo_score,
          });
        }
        return Promise.resolve({ error: null });
      },
    };
  }

  const client = {
    from: (table: string) => {
      if (table === "user_locations") return fromUserLocations();
      if (table === "travel_sessions") return fromTravelSessions();
      if (table === "user_allergen_elo") return fromUserAllergenElo();
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return client;
}

function emptyState(): TableState {
  return {
    user_locations: [],
    travel_sessions: [],
    user_allergen_elo: [],
  };
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

const USER_A = "user-a";
const USER_B = "user-b";

describe("activateTravel", () => {
  it("rejects invalid coordinates with a validation error", async () => {
    const client = makeStub(emptyState());
    const result = await activateTravel(client, USER_A, {
      lat: 999,
      lng: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("validation");
    }
  });

  it("creates a new location, inserts a session, and seeds location-scoped Elo", async () => {
    const state = emptyState();
    // Seed a home location + one home Elo row that must remain untouched.
    state.user_locations.push({
      id: "home-loc",
      user_id: USER_A,
      is_home: true,
      lat: 36.16,
      lng: -86.78,
      region: "Southeast",
      state: "TN",
    });
    state.user_allergen_elo.push({
      id: "home-elo",
      user_id: USER_A,
      allergen_id: "oak",
      location_id: "home-loc",
      elo_score: 1650,
    });

    const client = makeStub(state);
    const result = await activateTravel(client, USER_A, {
      lat: 40.7,
      lng: -74.0,
      state: "NY",
    });

    expect(result.success).toBe(true);
    expect(state.travel_sessions).toHaveLength(1);
    expect(state.travel_sessions[0].user_id).toBe(USER_A);
    expect(state.travel_sessions[0].ended_at).toBeNull();

    // Home elo untouched (count + value).
    const homeRows = state.user_allergen_elo.filter(
      (r) => r.location_id === "home-loc",
    );
    expect(homeRows).toHaveLength(1);
    expect(homeRows[0].elo_score).toBe(1650);

    // New travel-scoped Elo rows exist under the new location_id.
    const travelLocationId = state.travel_sessions[0].location_id;
    const travelRows = state.user_allergen_elo.filter(
      (r) => r.location_id === travelLocationId,
    );
    expect(travelRows.length).toBeGreaterThan(0);
  });

  it("reuses an existing nearby non-home user_locations row (~1km)", async () => {
    const state = emptyState();
    state.user_locations.push({
      id: "nearby",
      user_id: USER_A,
      is_home: false,
      lat: 40.7001,
      lng: -74.0001,
      region: "Northeast",
      state: "NY",
    });

    const client = makeStub(state);
    const result = await activateTravel(client, USER_A, {
      lat: 40.7,
      lng: -74.0,
    });

    expect(result.success).toBe(true);
    // No new user_locations row created.
    expect(state.user_locations).toHaveLength(1);
    if (result.success) {
      expect(result.session.location_id).toBe("nearby");
    }
  });

  it("rolls back the session row when Elo seeding fails (atomicity, #236)", async () => {
    const state = emptyState();
    const client = makeStub(state, {
      failEloInsert: "simulated elo insert failure",
    });

    const result = await activateTravel(client, USER_A, {
      lat: 40.7,
      lng: -74.0,
      state: "NY",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("elo_seed_failed");
    }

    // Compensating delete must have removed the session row — no active
    // session should remain.
    expect(state.travel_sessions).toHaveLength(0);

    // No travel-scoped Elo rows should have been persisted.
    expect(state.user_allergen_elo).toHaveLength(0);
  });

  it("returns 409-style active_session_exists when a session is already open", async () => {
    const state = emptyState();
    const client = makeStub(state);

    const first = await activateTravel(client, USER_A, {
      lat: 40.7,
      lng: -74.0,
    });
    expect(first.success).toBe(true);

    const second = await activateTravel(client, USER_A, {
      lat: 40.7,
      lng: -74.0,
    });
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.code).toBe("active_session_exists");
    }
  });
});

describe("deactivateTravel", () => {
  it("sets ended_at on the active session and leaves home Elo untouched", async () => {
    const state = emptyState();
    state.user_allergen_elo.push({
      id: "home-elo",
      user_id: USER_A,
      allergen_id: "oak",
      location_id: "home-loc",
      elo_score: 1650,
    });
    const client = makeStub(state);

    const activated = await activateTravel(client, USER_A, {
      lat: 40.7,
      lng: -74.0,
    });
    expect(activated.success).toBe(true);

    const deactivated = await deactivateTravel(client, USER_A);
    expect(deactivated.success).toBe(true);

    expect(state.travel_sessions[0].ended_at).not.toBeNull();

    // Home elo assertion.
    const homeRows = state.user_allergen_elo.filter(
      (r) => r.location_id === "home-loc",
    );
    expect(homeRows).toHaveLength(1);
    expect(homeRows[0].elo_score).toBe(1650);
  });

  it("returns no_active_session when there is nothing to end", async () => {
    const client = makeStub(emptyState());
    const result = await deactivateTravel(client, USER_A);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("no_active_session");
    }
  });
});

describe("getActiveSession", () => {
  it("returns null when no active session exists", async () => {
    const client = makeStub(emptyState());
    const result = await getActiveSession(client, USER_A);
    expect(result).toBeNull();
  });

  it("returns only the caller's own active session (RLS-consistent)", async () => {
    // RLS is enforced at the DB — our stub only filters by user_id on the
    // chain. This test simulates the surface behavior: user B's session
    // is not returned when user A queries.
    const state = emptyState();
    state.travel_sessions.push({
      id: "sess-b",
      user_id: USER_B,
      location_id: "loc-b",
      started_at: new Date().toISOString(),
      ended_at: null,
    });

    const client = makeStub(state);
    const result = await getActiveSession(client, USER_A);
    expect(result).toBeNull();
  });
});

describe("travel_sessions UPDATE policy migration (#236)", () => {
  // RLS cannot be exercised against the in-memory stub (auth.uid() has no
  // analogue). Instead we assert the SQL migration contains the WITH CHECK
  // clause so the DB-level defense-in-depth is in place. This guards
  // against regression of the user_id-reassignment attack.
  it("adds WITH CHECK (auth.uid() = user_id) to travel_sessions_update_own", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sqlPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20260420120000_travel_sessions_update_with_check.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    expect(sql).toMatch(/CREATE POLICY travel_sessions_update_own/);
    expect(sql).toMatch(/USING \(auth\.uid\(\) = user_id\)/);
    expect(sql).toMatch(/WITH CHECK \(auth\.uid\(\) = user_id\)/);
    // Must drop the old policy first since WITH CHECK cannot be altered in place.
    expect(sql).toMatch(/DROP POLICY travel_sessions_update_own/);
  });
});

// Silence logger.error calls that otherwise pollute test output.
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
