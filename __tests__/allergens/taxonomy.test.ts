import { describe, it, expect } from "vitest";
import {
  ALLERGEN_TAXONOMY,
  ALLERGEN_IDS,
  getAllergenEntry,
  type AllergenCategory,
} from "@/lib/allergens/taxonomy";

const ALLOWED_CATEGORIES: readonly AllergenCategory[] = [
  "pollen",
  "mold",
  "food",
  "pet",
  "dust",
  "other",
];

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("ALLERGEN_TAXONOMY", () => {
  it("is non-empty", () => {
    expect(ALLERGEN_TAXONOMY.length).toBeGreaterThan(0);
  });

  it("every entry has non-empty id, name, slug, and category", () => {
    for (const entry of ALLERGEN_TAXONOMY) {
      expect(entry.id, `entry ${JSON.stringify(entry)} missing id`).toBeTruthy();
      expect(entry.name, `entry ${entry.id} missing name`).toBeTruthy();
      expect(entry.slug, `entry ${entry.id} missing slug`).toBeTruthy();
      expect(entry.category, `entry ${entry.id} missing category`).toBeTruthy();
    }
  });

  it("IDs are unique", () => {
    const ids = ALLERGEN_TAXONOMY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("slugs are unique", () => {
    const slugs = ALLERGEN_TAXONOMY.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugs are valid kebab-case", () => {
    for (const entry of ALLERGEN_TAXONOMY) {
      expect(
        KEBAB_CASE.test(entry.slug),
        `slug "${entry.slug}" (id=${entry.id}) is not kebab-case`,
      ).toBe(true);
    }
  });

  it("category is one of the allowed literal values", () => {
    for (const entry of ALLERGEN_TAXONOMY) {
      expect(
        ALLOWED_CATEGORIES.includes(entry.category),
        `entry ${entry.id} has invalid category "${entry.category}"`,
      ).toBe(true);
    }
  });
});

describe("ALLERGEN_IDS", () => {
  it("length equals ALLERGEN_TAXONOMY length", () => {
    expect(ALLERGEN_IDS.length).toBe(ALLERGEN_TAXONOMY.length);
  });

  it("contains exactly the taxonomy entry IDs", () => {
    expect([...ALLERGEN_IDS].sort()).toEqual(
      ALLERGEN_TAXONOMY.map((e) => e.id).sort(),
    );
  });
});

describe("getAllergenEntry", () => {
  it("returns the entry for a known ID", () => {
    const first = ALLERGEN_TAXONOMY[0];
    const found = getAllergenEntry(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
    expect(found?.name).toBe(first.name);
  });

  it("returns undefined for an unknown ID", () => {
    expect(getAllergenEntry("definitely-not-a-real-allergen-id")).toBeUndefined();
  });

  it("returns undefined for the empty string", () => {
    expect(getAllergenEntry("")).toBeUndefined();
  });

  it("internal lookup map has no silent ID collisions", () => {
    // If two taxonomy entries ever shared an id, the Map would silently
    // drop one and its size would be less than the array length. This
    // invariant guards the O(1) lookup path in getAllergenEntry().
    const lookup = new Map(ALLERGEN_TAXONOMY.map((e) => [e.id, e]));
    expect(lookup.size).toBe(ALLERGEN_TAXONOMY.length);
  });
});
