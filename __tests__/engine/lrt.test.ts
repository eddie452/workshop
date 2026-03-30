import { describe, it, expect } from "vitest";
import {
  isWindFromRegion,
  detectLRT,
  detectLRTForAll,
} from "@/lib/engine/lrt";
import type { LRTAllergenInput } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

const makeLRTAllergen = (
  overrides: Partial<LRTAllergenInput> = {},
): LRTAllergenInput => ({
  allergen_id: "birch",
  lrt_capable: true,
  lrt_max_miles: 300,
  lrt_source_regions: ["Northeast", "Midwest"],
  ...overrides,
});

/* ------------------------------------------------------------------ */
/* isWindFromRegion                                                     */
/* ------------------------------------------------------------------ */

describe("isWindFromRegion", () => {
  it("returns true when wind is from the region's bearing", () => {
    // Northeast bearing is 45 degrees
    expect(isWindFromRegion(45, "Northeast")).toBe(true);
  });

  it("returns true within tolerance window", () => {
    // Northeast bearing 45, tolerance 45 → range 0-90
    expect(isWindFromRegion(0, "Northeast")).toBe(true);
    expect(isWindFromRegion(90, "Northeast")).toBe(true);
  });

  it("returns false outside tolerance window", () => {
    // Northeast bearing 45, tolerance 45 → 91 is outside
    expect(isWindFromRegion(91, "Northeast")).toBe(false);
    expect(isWindFromRegion(180, "Northeast")).toBe(false);
  });

  it("handles wrap-around at 360/0 degrees", () => {
    // Midwest bearing is 0, tolerance 45 → 315-360 and 0-45
    expect(isWindFromRegion(350, "Midwest")).toBe(true);
    expect(isWindFromRegion(10, "Midwest")).toBe(true);
    expect(isWindFromRegion(46, "Midwest")).toBe(false);
  });

  it("returns false for unknown regions", () => {
    expect(isWindFromRegion(45, "UnknownRegion")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* detectLRT                                                           */
/* ------------------------------------------------------------------ */

describe("detectLRT", () => {
  it("detects LRT when wind aligns with a distant source region", () => {
    // Birch from Northeast, user in Southwest, wind from 45 (NE)
    const result = detectLRT(makeLRTAllergen(), "Southwest", 45);
    expect(result.lrt_detected).toBe(true);
    expect(result.multiplier).toBe(1.5);
  });

  it("does not detect LRT when allergen is not LRT-capable", () => {
    const allergen = makeLRTAllergen({ lrt_capable: false });
    const result = detectLRT(allergen, "Southwest", 45);
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("does not detect LRT when wind data is null", () => {
    const result = detectLRT(makeLRTAllergen(), "Southwest", null);
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("does not detect LRT when wind is not from any source region", () => {
    // Wind from 225 (SW) — birch sources are NE and Midwest
    const result = detectLRT(makeLRTAllergen(), "Southwest", 225);
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("excludes user's own region from LRT sources", () => {
    // User in Northeast, birch source includes Northeast
    // Wind from 45 (NE) — but that's the user's own region, should not count
    const allergen = makeLRTAllergen({
      lrt_source_regions: ["Northeast"],
    });
    const result = detectLRT(allergen, "Northeast", 45);
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("preserves allergen_id in result", () => {
    const result = detectLRT(
      makeLRTAllergen({ allergen_id: "cedar-juniper" }),
      "Southwest",
      45,
    );
    expect(result.allergen_id).toBe("cedar-juniper");
  });
});

/* ------------------------------------------------------------------ */
/* detectLRTForAll                                                     */
/* ------------------------------------------------------------------ */

describe("detectLRTForAll", () => {
  it("returns results for all allergens", () => {
    const allergens = [
      makeLRTAllergen({ allergen_id: "birch" }),
      makeLRTAllergen({ allergen_id: "oak", lrt_capable: false }),
    ];
    const results = detectLRTForAll(allergens, "Southwest", 45);
    expect(results).toHaveLength(2);
    expect(results[0].allergen_id).toBe("birch");
    expect(results[0].lrt_detected).toBe(true);
    expect(results[1].allergen_id).toBe("oak");
    expect(results[1].lrt_detected).toBe(false);
  });

  it("returns empty array for empty input", () => {
    expect(detectLRTForAll([], "Southwest", 45)).toHaveLength(0);
  });
});
