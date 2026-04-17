/**
 * Allergen taxonomy — canonical enumeration of every allergen ID the
 * engine can emit. Single source of truth; join key for thumbnails,
 * confidence scoring, and bracket traces.
 *
 * Populated from `lib/data/allergens-seed.json` (the seed data loaded by
 * `scripts/seed-allergens.ts` into the Supabase `allergens` reference
 * table). Every ID below appears verbatim in that file; no IDs are
 * invented here.
 *
 * The `category` field collapses the seed's engine-facing categories
 * (`tree` / `grass` / `weed` / `mold` / `indoor`) into the consumer-facing
 * taxonomy (pollen / mold / food / pet / dust / other) used for thumbnail
 * grouping and UI copy:
 *
 *   seed tree  | seed grass | seed weed   -> pollen
 *   seed mold                              -> mold
 *   seed indoor (dust-mites)               -> dust
 *   seed indoor (cat-dander, dog-dander)   -> pet
 *   seed indoor (cockroach, mouse)         -> other
 *
 * Parent epic: #152
 */

export type AllergenCategory =
  | "pollen"
  | "mold"
  | "food"
  | "pet"
  | "dust"
  | "other";

export interface AllergenTaxonomyEntry {
  /** Canonical ID (engine join key). Kebab-case. */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** High-level category for grouping and asset resolution. */
  readonly category: AllergenCategory;
  /** Kebab-case asset filename slug. Equal to `id` for current entries. */
  readonly slug: string;
}

export const ALLERGEN_TAXONOMY = [
  // Tree pollens
  { id: "oak", name: "Oak", category: "pollen", slug: "oak" },
  { id: "birch", name: "Birch", category: "pollen", slug: "birch" },
  { id: "cedar-juniper", name: "Cedar / Juniper", category: "pollen", slug: "cedar-juniper" },
  { id: "elm", name: "Elm", category: "pollen", slug: "elm" },
  { id: "maple", name: "Maple", category: "pollen", slug: "maple" },
  { id: "pine", name: "Pine", category: "pollen", slug: "pine" },
  { id: "ash", name: "Ash", category: "pollen", slug: "ash" },
  { id: "cottonwood", name: "Cottonwood", category: "pollen", slug: "cottonwood" },
  { id: "alder", name: "Alder", category: "pollen", slug: "alder" },
  { id: "walnut", name: "Walnut", category: "pollen", slug: "walnut" },
  { id: "pecan", name: "Pecan", category: "pollen", slug: "pecan" },
  { id: "olive", name: "Olive", category: "pollen", slug: "olive" },
  { id: "hickory", name: "Hickory", category: "pollen", slug: "hickory" },
  { id: "mulberry", name: "Mulberry", category: "pollen", slug: "mulberry" },
  { id: "privet", name: "Privet", category: "pollen", slug: "privet" },
  { id: "cypress", name: "Cypress", category: "pollen", slug: "cypress" },
  { id: "mesquite", name: "Mesquite", category: "pollen", slug: "mesquite" },

  // Grass pollens
  { id: "bermuda-grass", name: "Bermuda Grass", category: "pollen", slug: "bermuda-grass" },
  { id: "timothy-grass", name: "Timothy Grass", category: "pollen", slug: "timothy-grass" },
  { id: "rye-grass", name: "Rye Grass", category: "pollen", slug: "rye-grass" },
  { id: "bahia-grass", name: "Bahia Grass", category: "pollen", slug: "bahia-grass" },
  { id: "johnson-grass", name: "Johnson Grass", category: "pollen", slug: "johnson-grass" },
  { id: "kentucky-bluegrass", name: "Kentucky Bluegrass", category: "pollen", slug: "kentucky-bluegrass" },
  { id: "orchard-grass", name: "Orchard Grass", category: "pollen", slug: "orchard-grass" },
  { id: "sweet-vernal-grass", name: "Sweet Vernal Grass", category: "pollen", slug: "sweet-vernal-grass" },

  // Weed pollens
  { id: "ragweed", name: "Ragweed", category: "pollen", slug: "ragweed" },
  { id: "sagebrush", name: "Sagebrush", category: "pollen", slug: "sagebrush" },
  { id: "lambs-quarters", name: "Lamb's Quarters", category: "pollen", slug: "lambs-quarters" },
  { id: "pigweed", name: "Pigweed", category: "pollen", slug: "pigweed" },
  { id: "plantain", name: "Plantain", category: "pollen", slug: "plantain" },
  { id: "dock-sorrel", name: "Dock / Sorrel", category: "pollen", slug: "dock-sorrel" },
  { id: "mugwort", name: "Mugwort", category: "pollen", slug: "mugwort" },
  { id: "cocklebur", name: "Cocklebur", category: "pollen", slug: "cocklebur" },
  { id: "marsh-elder", name: "Marsh Elder", category: "pollen", slug: "marsh-elder" },
  { id: "russian-thistle", name: "Russian Thistle", category: "pollen", slug: "russian-thistle" },
  { id: "nettle", name: "Nettle", category: "pollen", slug: "nettle" },

  // Molds
  { id: "alternaria", name: "Alternaria", category: "mold", slug: "alternaria" },
  { id: "aspergillus", name: "Aspergillus", category: "mold", slug: "aspergillus" },
  { id: "cladosporium", name: "Cladosporium", category: "mold", slug: "cladosporium" },
  { id: "penicillium", name: "Penicillium", category: "mold", slug: "penicillium" },
  { id: "stachybotrys", name: "Black Mold", category: "mold", slug: "stachybotrys" },
  { id: "fusarium", name: "Fusarium", category: "mold", slug: "fusarium" },

  // Indoor — dust
  { id: "dust-mites", name: "Dust Mites", category: "dust", slug: "dust-mites" },

  // Indoor — pets
  { id: "cat-dander", name: "Cat Dander", category: "pet", slug: "cat-dander" },
  { id: "dog-dander", name: "Dog Dander", category: "pet", slug: "dog-dander" },

  // Indoor — other
  { id: "cockroach", name: "Cockroach", category: "other", slug: "cockroach" },
  { id: "mouse", name: "Mouse", category: "other", slug: "mouse" },
] as const satisfies readonly AllergenTaxonomyEntry[];

/**
 * String literal union of every canonical allergen ID in the taxonomy.
 * Derived from {@link ALLERGEN_TAXONOMY} so adding or removing an entry
 * automatically updates every consumer that accepts `AllergenId`.
 */
export type AllergenId = (typeof ALLERGEN_TAXONOMY)[number]["id"];

export const ALLERGEN_IDS: readonly string[] = ALLERGEN_TAXONOMY.map(
  (e) => e.id,
);

/**
 * Module-level index built once at import time. Replaces a linear
 * `Array.find()` scan (O(n)) with an O(1) `Map.get()` lookup.
 */
const ALLERGEN_BY_ID: ReadonlyMap<string, AllergenTaxonomyEntry> = new Map(
  ALLERGEN_TAXONOMY.map((entry) => [entry.id, entry]),
);

/** Lookup by known `AllergenId` — entry is guaranteed to exist. */
export function getAllergenEntry(id: AllergenId): AllergenTaxonomyEntry;
/** Lookup by arbitrary string — returns undefined for unknown IDs. */
export function getAllergenEntry(
  id: string,
): AllergenTaxonomyEntry | undefined;
export function getAllergenEntry(
  id: string,
): AllergenTaxonomyEntry | undefined {
  return ALLERGEN_BY_ID.get(id);
}
