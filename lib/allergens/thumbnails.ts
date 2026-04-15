/**
 * Allergen thumbnail resolver.
 *
 * Pure, deterministic helper used by both Server Components and client UI
 * (notably the bracket view landing in epic #152). No React / UI-library
 * imports — safe to call from anywhere.
 *
 * This ticket (#176) intentionally ships only the generic fallback icon.
 * Per-allergen bespoke imagery is delivered by the sibling asset-procurement
 * ticket in epic #152; when those assets land, add entries to THUMBNAIL_MAP
 * below keyed by the allergen ID.
 */

export interface AllergenThumbnail {
  /** Public-relative path to the SVG asset. */
  src: string;
  /** Screen-reader-friendly alt text. Required on every return. */
  alt: string;
}

const GENERIC_FALLBACK: AllergenThumbnail = {
  src: "/allergens/generic-plant.svg",
  alt: "Pollen allergen thumbnail",
};

/**
 * Per-allergen thumbnail registry.
 *
 * Intentionally empty in ticket #176 — every lookup resolves to the generic
 * fallback. Populate as bespoke assets are procured under epic #152.
 */
const THUMBNAIL_MAP: Record<string, AllergenThumbnail> = {};

/**
 * Resolve a thumbnail for an allergen ID. Always returns a valid thumbnail:
 * unknown / empty / undefined IDs fall back to the generic plant silhouette.
 */
export function getAllergenThumbnail(id: string): AllergenThumbnail {
  return THUMBNAIL_MAP[id] ?? GENERIC_FALLBACK;
}
