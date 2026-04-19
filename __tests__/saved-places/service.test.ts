/**
 * Saved Places Service Tests
 *
 * Covers:
 *  - listPlaces filters by user_id and is_home = false.
 *  - createPlace validates nickname and forces is_home = false.
 *  - updatePlace / deletePlace refuse to mutate home rows (returns status 403).
 *  - Not-found rows return status 404.
 */

import { describe, it, expect, vi } from "vitest";
import {
  listPlaces,
  createPlace,
  updatePlace,
  deletePlace,
} from "@/lib/saved-places/service";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Mock helpers (Proxy chain — same pattern as child-profiles tests)   */
/* ------------------------------------------------------------------ */

interface ChainSpy {
  calls: Array<{ method: string; args: unknown[] }>;
}

function makeChain(result: unknown, spy: ChainSpy): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return (...args: unknown[]) => {
        spy.calls.push({ method: prop, args });
        return makeChain(result, spy);
      };
    },
  };
  return new Proxy({}, handler);
}

function makeClient(
  handler: (table: string, callIndex: number) => unknown,
): { client: SupabaseClient; spy: ChainSpy } {
  const spy: ChainSpy = { calls: [] };
  const callCounts: Record<string, number> = {};
  const client = {
    from: (table: string) => {
      callCounts[table] = (callCounts[table] ?? 0) + 1;
      const result = handler(table, callCounts[table]);
      return makeChain(result, spy);
    },
  } as unknown as SupabaseClient;
  return { client, spy };
}

/* ------------------------------------------------------------------ */
/* Tests                                                                */
/* ------------------------------------------------------------------ */

describe("listPlaces", () => {
  it("filters by user_id and is_home = false", async () => {
    const sampleRows = [
      {
        id: "p1",
        nickname: "Grandma",
        address: null,
        lat: null,
        lng: null,
        zip: null,
        state: null,
        last_visit: null,
        visit_count: 0,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const { client, spy } = makeClient(() => ({
      data: sampleRows,
      error: null,
    }));

    const result = await listPlaces(client, "user-1");

    expect(result).toEqual(sampleRows);
    // Verify .eq was called for both user_id and is_home filters
    const eqCalls = spy.calls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["user_id", "user-1"] },
        { method: "eq", args: ["is_home", false] },
      ]),
    );
  });

  it("throws when Supabase returns an error", async () => {
    const { client } = makeClient(() => ({
      data: null,
      error: { message: "db exploded" },
    }));

    await expect(listPlaces(client, "user-1")).rejects.toThrow(
      /Failed to list saved places/,
    );
  });
});

describe("createPlace", () => {
  it("rejects empty nickname", async () => {
    const { client } = makeClient(() => ({ data: null, error: null }));
    const result = await createPlace(client, "user-1", { nickname: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/required/i);
  });

  it("rejects out-of-range lat/lng", async () => {
    const { client } = makeClient(() => ({ data: null, error: null }));
    const result = await createPlace(client, "user-1", {
      nickname: "Home2",
      lat: 999,
      lng: 0,
    });
    expect(result.success).toBe(false);
  });

  it("inserts with is_home = false regardless of input", async () => {
    const returned = {
      id: "p1",
      nickname: "Grandma",
      address: null,
      lat: null,
      lng: null,
      zip: null,
      state: null,
      last_visit: null,
      visit_count: 0,
      created_at: "2026-01-01T00:00:00Z",
    };
    const inserts: unknown[] = [];

    // Stub client with an insert().select().single() chain capturing the row
    const client = {
      from: vi.fn().mockReturnValue({
        insert: (row: unknown) => {
          inserts.push(row);
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: returned, error: null }),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;

    // Cast to unknown-shape to simulate a caller sneaking `is_home: true`
    // in the request body. The service must still force is_home=false.
    const roguePayload = {
      nickname: "Grandma",
      is_home: true,
    } as unknown as Parameters<typeof createPlace>[2];
    const result = await createPlace(client, "user-1", roguePayload);

    expect(result.success).toBe(true);
    if (result.success) expect(result.place).toEqual(returned);
    expect(inserts).toHaveLength(1);
    // Critical: insert payload must always force is_home to false
    expect((inserts[0] as { is_home: boolean }).is_home).toBe(false);
    expect((inserts[0] as { user_id: string }).user_id).toBe("user-1");
  });
});

describe("updatePlace", () => {
  it("returns 404 when row is missing", async () => {
    // getPlaceForOwner fails on first from() call
    const client = {
      from: vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: "not found" } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await updatePlace(client, "missing", "user-1", {
      nickname: "X",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(404);
  });

  it("returns 403 when target row is a home row", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "home-1", is_home: true },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await updatePlace(client, "home-1", "user-1", {
      nickname: "Hacked",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(403);
      expect(result.error).toMatch(/home/i);
    }
  });

  it("updates non-home rows successfully", async () => {
    let fromCall = 0;
    const client = {
      from: vi.fn().mockImplementation(() => {
        fromCall++;
        if (fromCall === 1) {
          // getPlaceForOwner — returns non-home row
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { id: "p1", is_home: false },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        // actual update call
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            }),
          }),
        };
      }),
    } as unknown as SupabaseClient;

    const result = await updatePlace(client, "p1", "user-1", {
      nickname: "Renamed",
    });
    expect(result.success).toBe(true);
  });
});

describe("deletePlace", () => {
  it("returns 404 when row is missing", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: "nope" } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await deletePlace(client, "missing", "user-1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(404);
  });

  it("returns 403 when target row is a home row", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "home-1", is_home: true },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await deletePlace(client, "home-1", "user-1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(403);
  });

  it("deletes non-home rows successfully", async () => {
    let fromCall = 0;
    const client = {
      from: vi.fn().mockImplementation(() => {
        fromCall++;
        if (fromCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { id: "p1", is_home: false },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          delete: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            }),
          }),
        };
      }),
    } as unknown as SupabaseClient;

    const result = await deletePlace(client, "p1", "user-1");
    expect(result.success).toBe(true);
  });
});
