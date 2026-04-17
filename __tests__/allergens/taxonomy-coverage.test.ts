import { describe, it, expect } from "vitest";
import allergensSeed from "@/lib/data/allergens-seed.json";
import { ALLERGEN_IDS } from "@/lib/allergens/taxonomy";

/**
 * Regression guard: every allergen ID that the engine can emit — i.e.
 * every ID seeded into the Supabase `allergens` reference table — must
 * also appear in the canonical taxonomy manifest. If this test fails,
 * an allergen was added to the seed data without a corresponding
 * taxonomy entry (parent epic #152, ticket #201).
 */

interface SeedRow {
  id: string;
}

describe("taxonomy coverage vs. allergens-seed.json", () => {
  // Cast to `Set<string>` at the boundary so set-membership checks can
  // accept arbitrary seed IDs. `ALLERGEN_IDS` is typed as
  // `readonly AllergenId[]`, which narrows downstream consumers but
  // would otherwise reject `.has(seedId: string)` here.
  const seedIds = new Set((allergensSeed as SeedRow[]).map((r) => r.id));
  const taxonomyIds: Set<string> = new Set(ALLERGEN_IDS);

  it("seed data is non-empty (sanity)", () => {
    expect(seedIds.size).toBeGreaterThan(0);
  });

  it("every seed allergen ID is present in ALLERGEN_TAXONOMY", () => {
    const missing = [...seedIds].filter((id) => !taxonomyIds.has(id));
    expect(
      missing,
      `Seed IDs missing from taxonomy manifest: ${JSON.stringify(missing)}`,
    ).toEqual([]);
  });

  it("taxonomy does not contain IDs absent from the seed (no phantom entries)", () => {
    const extra = [...taxonomyIds].filter((id) => !seedIds.has(id));
    expect(
      extra,
      `Taxonomy IDs with no matching seed row: ${JSON.stringify(extra)}`,
    ).toEqual([]);
  });

  it("taxonomy and seed have the same cardinality", () => {
    expect(taxonomyIds.size).toBe(seedIds.size);
  });
});
