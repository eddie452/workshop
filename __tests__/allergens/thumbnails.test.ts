import { describe, it, expect } from "vitest";
import { getAllergenThumbnail } from "@/lib/allergens/thumbnails";

describe("getAllergenThumbnail", () => {
  const FALLBACK_SRC = "/allergens/generic-plant.svg";
  const FALLBACK_ALT = "Pollen allergen thumbnail";

  it("returns the generic fallback for an unknown allergen ID", () => {
    const result = getAllergenThumbnail("not-a-real-allergen");
    expect(result.src).toBe(FALLBACK_SRC);
    expect(result.alt).toBe(FALLBACK_ALT);
  });

  it("returns the generic fallback for an empty string ID", () => {
    const result = getAllergenThumbnail("");
    expect(result.src).toBe(FALLBACK_SRC);
    expect(result.alt).toBe(FALLBACK_ALT);
  });

  it("returns the generic fallback for any ID while THUMBNAIL_MAP is empty", () => {
    // Ticket #176 intentionally ships with no bespoke entries — every
    // plausible allergen ID must resolve to the fallback until the
    // sibling asset-procurement ticket lands.
    const ids = ["ragweed", "oak-pollen", "timothy-grass", "birch"];
    for (const id of ids) {
      const result = getAllergenThumbnail(id);
      expect(result.src).toBe(FALLBACK_SRC);
      expect(result.alt).toBe(FALLBACK_ALT);
    }
  });

  it("always returns non-empty alt text (accessibility invariant)", () => {
    const result = getAllergenThumbnail("anything");
    expect(result.alt.length).toBeGreaterThan(0);
  });
});
