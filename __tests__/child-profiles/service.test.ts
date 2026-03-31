/**
 * Child Profiles Service Tests
 *
 * Tests business logic for CRUD operations, validation, and limits.
 */

import { describe, it, expect, vi } from "vitest";
import {
  createChild,
  updateChild,
  deleteChild,
  listChildren,
  getChildCount,
  getChild,
} from "@/lib/child-profiles/service";
import { MAX_CHILDREN } from "@/lib/child-profiles/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Mock Supabase client factory                                        */
/* ------------------------------------------------------------------ */

/**
 * Creates a mock Supabase client where .from(table) returns a chainable
 * mock that terminates at the specified end value.
 *
 * The chain supports arbitrary method calls and resolves to the final
 * result when awaited or when a terminal method is called.
 */
function makeMockClient(tableResults: Record<string, unknown>) {
  function makeChain(result: unknown): unknown {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === "then") {
          // Make it thenable — resolves to the result
          return (resolve: (v: unknown) => void) => resolve(result);
        }
        // Any method call returns the chain again
        return () => makeChain(result);
      },
    };
    return new Proxy({}, handler);
  }

  const client = {
    from: (table: string) => makeChain(tableResults[table] ?? { data: null, error: null }),
  } as unknown as SupabaseClient;

  return client;
}

/**
 * Creates a mock client where .from(table) calls a callback each time,
 * allowing different results per call to the same table.
 */
function makeMockClientSequential(handler: (table: string, callIndex: number) => unknown) {
  const callCounts: Record<string, number> = {};

  function makeChain(result: unknown): unknown {
    const proxyHandler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(result);
        }
        return () => makeChain(result);
      },
    };
    return new Proxy({}, proxyHandler);
  }

  const client = {
    from: (table: string) => {
      callCounts[table] = (callCounts[table] ?? 0) + 1;
      const result = handler(table, callCounts[table]);
      return makeChain(result);
    },
  } as unknown as SupabaseClient;

  return client;
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("child-profiles service", () => {
  describe("MAX_CHILDREN constant", () => {
    it("is 5", () => {
      expect(MAX_CHILDREN).toBe(5);
    });
  });

  describe("getChildCount", () => {
    it("returns the count from Supabase", async () => {
      const client = makeMockClient({
        child_profiles: { count: 3, error: null },
      });

      const count = await getChildCount(client, "parent-1");
      expect(count).toBe(3);
    });

    it("returns 0 when no children exist", async () => {
      const client = makeMockClient({
        child_profiles: { count: 0, error: null },
      });

      const count = await getChildCount(client, "parent-1");
      expect(count).toBe(0);
    });

    it("returns 0 when count is null", async () => {
      const client = makeMockClient({
        child_profiles: { count: null, error: null },
      });

      const count = await getChildCount(client, "parent-1");
      expect(count).toBe(0);
    });
  });

  describe("listChildren", () => {
    it("returns list of children sorted by created_at", async () => {
      const mockChildren = [
        { id: "c1", name: "Alice", birth_year: 2020, created_at: "2024-01-01", has_pets: false, prior_allergy_diagnosis: false, known_allergens: null },
        { id: "c2", name: "Bob", birth_year: 2018, created_at: "2024-02-01", has_pets: true, prior_allergy_diagnosis: true, known_allergens: ["dust"] },
      ];

      const client = makeMockClient({
        child_profiles: { data: mockChildren, error: null },
      });

      const children = await listChildren(client, "parent-1");
      expect(children).toHaveLength(2);
      expect(children[0].name).toBe("Alice");
      expect(children[1].name).toBe("Bob");
    });

    it("returns empty array when no children", async () => {
      const client = makeMockClient({
        child_profiles: { data: [], error: null },
      });

      const children = await listChildren(client, "parent-1");
      expect(children).toHaveLength(0);
    });
  });

  describe("getChild", () => {
    it("returns null when child not found", async () => {
      const client = makeMockClient({
        child_profiles: { data: null, error: { message: "not found" } },
      });

      const child = await getChild(client, "c-nonexistent", "parent-1");
      expect(child).toBeNull();
    });

    it("returns child when found", async () => {
      const mockChild = {
        id: "c1",
        name: "Alice",
        birth_year: 2020,
        created_at: "2024-01-01",
        has_pets: false,
        prior_allergy_diagnosis: false,
        known_allergens: null,
      };

      const client = makeMockClient({
        child_profiles: { data: mockChild, error: null },
      });

      const child = await getChild(client, "c1", "parent-1");
      expect(child?.name).toBe("Alice");
    });
  });

  describe("createChild", () => {
    it("rejects empty name", async () => {
      const client = makeMockClient({});

      const result = await createChild(client, "parent-1", { name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("name is required");
      }
    });

    it("rejects whitespace-only name", async () => {
      const client = makeMockClient({});

      const result = await createChild(client, "parent-1", { name: "   " });
      expect(result.success).toBe(false);
    });

    it("rejects name over 100 characters", async () => {
      const client = makeMockClient({});
      const longName = "A".repeat(101);

      const result = await createChild(client, "parent-1", { name: longName });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("100 characters");
      }
    });

    it("enforces MAX_CHILDREN limit", async () => {
      const client = makeMockClient({
        child_profiles: { count: MAX_CHILDREN, error: null },
      });

      const result = await createChild(client, "parent-1", { name: "Sixth Child" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(`Maximum of ${MAX_CHILDREN}`);
      }
    });

    it("creates child profile when under limit", async () => {
      const mockChild = {
        id: "new-child-1",
        name: "Charlie",
        birth_year: 2021,
        created_at: "2024-03-01",
        has_pets: null,
        prior_allergy_diagnosis: false,
        known_allergens: null,
      };

      const client = makeMockClientSequential((table, callIndex) => {
        if (table === "child_profiles" && callIndex === 1) {
          // getChildCount
          return { count: 2, error: null };
        }
        if (table === "child_profiles" && callIndex === 2) {
          // insert
          return { data: mockChild, error: null };
        }
        if (table === "user_allergen_elo") {
          // seedChildElo — parent has no Elo
          return { data: [], error: null };
        }
        return { data: null, error: null };
      });

      const result = await createChild(client, "parent-1", {
        name: "Charlie",
        birth_year: 2021,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.child.name).toBe("Charlie");
        expect(result.child.id).toBe("new-child-1");
      }
    });
  });

  describe("updateChild", () => {
    it("rejects empty name update", async () => {
      const client = makeMockClient({});

      const result = await updateChild(client, "c1", "parent-1", { name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("cannot be empty");
      }
    });

    it("rejects name over 100 characters", async () => {
      const client = makeMockClient({});

      const result = await updateChild(client, "c1", "parent-1", {
        name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("successfully updates child", async () => {
      const client = makeMockClient({
        child_profiles: { error: null },
      });

      const result = await updateChild(client, "c1", "parent-1", {
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("deleteChild", () => {
    it("successfully deletes child", async () => {
      const client = makeMockClient({
        child_profiles: { error: null },
      });

      const result = await deleteChild(client, "c1", "parent-1");
      expect(result.success).toBe(true);
    });

    it("returns error on delete failure", async () => {
      const client = makeMockClient({
        child_profiles: { error: { message: "RLS violation" } },
      });

      const result = await deleteChild(client, "c1", "wrong-parent");
      expect(result.success).toBe(false);
    });
  });
});

// Suppress unused import warning
void vi;
