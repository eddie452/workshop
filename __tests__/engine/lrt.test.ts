import { describe, it, expect } from "vitest";
import {
  isWindFromRegion,
  detectLRT,
  detectLRTForAll,
  regionDistanceMiles,
  distanceDecayMultiplier,
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

/* ------------------------------------------------------------------ */
/* regionDistanceMiles                                                 */
/* ------------------------------------------------------------------ */

describe("regionDistanceMiles", () => {
  it("returns 0 for same region", () => {
    expect(regionDistanceMiles("Southwest", "Southwest")).toBe(0);
  });

  it("is symmetric across region pairs", () => {
    expect(regionDistanceMiles("South Central", "Southeast")).toBe(
      regionDistanceMiles("Southeast", "South Central"),
    );
    expect(regionDistanceMiles("Northeast", "Northwest")).toBe(
      regionDistanceMiles("Northwest", "Northeast"),
    );
  });

  it("returns a positive distance for distinct regions", () => {
    const d = regionDistanceMiles("South Central", "Midwest");
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(0);
  });

  it("returns null for unknown regions", () => {
    expect(regionDistanceMiles("Atlantis", "Southwest")).toBeNull();
    expect(regionDistanceMiles("Southwest", "Atlantis")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* distanceDecayMultiplier                                             */
/* ------------------------------------------------------------------ */

describe("distanceDecayMultiplier", () => {
  it("returns full 1.5 boost at zero distance", () => {
    expect(distanceDecayMultiplier(0, 1000)).toBeCloseTo(1.5, 5);
  });

  it("decays to ~1.1 minimum at max distance", () => {
    expect(distanceDecayMultiplier(1000, 1000)).toBeCloseTo(1.1, 5);
  });

  it("interpolates linearly in the middle", () => {
    // At halfway point, midway between 1.5 and 1.1 → 1.3
    expect(distanceDecayMultiplier(500, 1000)).toBeCloseTo(1.3, 5);
  });

  it("returns 1.0 (no boost) when distance exceeds max", () => {
    expect(distanceDecayMultiplier(1500, 1000)).toBe(1.0);
  });

  it("returns 1.0 for non-positive max distance", () => {
    expect(distanceDecayMultiplier(100, 0)).toBe(1.0);
  });

  it("produces higher boost for a closer source than a farther one (same max)", () => {
    const close = distanceDecayMultiplier(200, 1000);
    const far = distanceDecayMultiplier(800, 1000);
    expect(close).toBeGreaterThan(far);
  });
});

/* ------------------------------------------------------------------ */
/* detectLRT — bloom gate                                              */
/* ------------------------------------------------------------------ */

describe("detectLRT with bloom gate", () => {
  const cedarAllergen = (): LRTAllergenInput => ({
    allergen_id: "cedar-juniper",
    lrt_capable: true,
    lrt_max_miles: 1000,
    lrt_source_regions: ["South Central"],
  });

  it("detects cedar LRT when source in bloom, wind from south, within range", () => {
    // User in Southwest (or Midwest), source South Central bearing 180.
    // Wind from 180 → from South Central.
    const result = detectLRT(cedarAllergen(), "Midwest", 180, {
      isSourceInBloom: () => true,
    });
    expect(result.lrt_detected).toBe(true);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("does NOT detect LRT when source region is not in bloom", () => {
    const result = detectLRT(cedarAllergen(), "Midwest", 180, {
      isSourceInBloom: () => false,
    });
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("does NOT detect LRT when wind direction is unfavorable", () => {
    // Wind from 0 (N) — not from South Central (180)
    const result = detectLRT(cedarAllergen(), "Midwest", 0, {
      isSourceInBloom: () => true,
    });
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("passes allergen_id and source region to the bloom predicate", () => {
    const seen: Array<[string, string]> = [];
    detectLRT(cedarAllergen(), "Midwest", 180, {
      isSourceInBloom: (id, region) => {
        seen.push([id, region]);
        return true;
      },
    });
    expect(seen).toContainEqual(["cedar-juniper", "South Central"]);
  });
});

/* ------------------------------------------------------------------ */
/* detectLRT — distance decay                                          */
/* ------------------------------------------------------------------ */

describe("detectLRT with distance decay", () => {
  it("applies decayed multiplier (not flat 1.5) when applyDistanceDecay is true", () => {
    // Cedar from South Central, user in Midwest → distance 700 mi, max 1000.
    // Wind from 180 (South Central).
    const result = detectLRT(
      {
        allergen_id: "cedar-juniper",
        lrt_capable: true,
        lrt_max_miles: 1000,
        lrt_source_regions: ["South Central"],
      },
      "Midwest",
      180,
      { applyDistanceDecay: true },
    );
    expect(result.lrt_detected).toBe(true);
    // 700/1000 of the way from 1.5 down to 1.1 → 1.5 - 0.7*0.4 = 1.22
    expect(result.multiplier).toBeCloseTo(1.22, 2);
  });

  it("reduces boost for farther sources than closer ones", () => {
    // Ragweed (400 mi max) from South Central.
    // User in Southeast → ~700 mi → out of range.
    const farResult = detectLRT(
      {
        allergen_id: "ragweed",
        lrt_capable: true,
        lrt_max_miles: 400,
        lrt_source_regions: ["South Central"],
      },
      "Southeast",
      180,
      { applyDistanceDecay: true },
    );
    // Out of range → no LRT
    expect(farResult.lrt_detected).toBe(false);

    // Same allergen, user in Midwest → 700 mi — still out of 400 max
    const midResult = detectLRT(
      {
        allergen_id: "ragweed",
        lrt_capable: true,
        lrt_max_miles: 400,
        lrt_source_regions: ["South Central"],
      },
      "Midwest",
      180,
      { applyDistanceDecay: true },
    );
    expect(midResult.lrt_detected).toBe(false);

    // Now with a bigger lrt_max_miles — closer user gets a higher boost
    const a: LRTAllergenInput = {
      allergen_id: "cedar-juniper",
      lrt_capable: true,
      lrt_max_miles: 1500,
      lrt_source_regions: ["South Central"],
    };
    const closerUserResult = detectLRT(a, "Midwest", 180, {
      applyDistanceDecay: true,
    });
    const fartherUserResult = detectLRT(a, "Northeast", 180, {
      applyDistanceDecay: true,
    });
    // Both should detect, but closer user should have larger multiplier.
    // Northeast bearing is 45, but we query wind from 180 (South Central source).
    // Both have source "South Central", so both eligible.
    expect(closerUserResult.lrt_detected).toBe(true);
    // Northeast is 1400 mi from South Central → still in 1500 range
    expect(fartherUserResult.lrt_detected).toBe(true);
    expect(closerUserResult.multiplier).toBeGreaterThan(
      fartherUserResult.multiplier,
    );
  });

  it("produces no boost when source exceeds lrt_max_miles", () => {
    // Bermuda max 100 mi, source South Central → any inter-region distance >100.
    const result = detectLRT(
      {
        allergen_id: "bermuda",
        lrt_capable: true,
        lrt_max_miles: 100,
        lrt_source_regions: ["South Central"],
      },
      "Midwest",
      180,
      { applyDistanceDecay: true },
    );
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });

  it("does NOT affect non-LRT allergens", () => {
    const result = detectLRT(
      {
        allergen_id: "dust-mite",
        lrt_capable: false,
        lrt_max_miles: null,
        lrt_source_regions: [],
      },
      "Midwest",
      180,
      { applyDistanceDecay: true, isSourceInBloom: () => true },
    );
    expect(result.lrt_detected).toBe(false);
    expect(result.multiplier).toBe(1.0);
  });
});

/* ------------------------------------------------------------------ */
/* detectLRT — combined (bloom + distance decay)                       */
/* ------------------------------------------------------------------ */

describe("detectLRT combined scenarios", () => {
  it("Cedar Fever: user in Midwest, source in bloom in South Central, south wind, within range", () => {
    const result = detectLRT(
      {
        allergen_id: "cedar-juniper",
        lrt_capable: true,
        lrt_max_miles: 1000,
        lrt_source_regions: ["South Central"],
      },
      "Midwest",
      180, // wind from South
      {
        isSourceInBloom: (id, region) =>
          id === "cedar-juniper" && region === "South Central",
        applyDistanceDecay: true,
      },
    );
    expect(result.lrt_detected).toBe(true);
    expect(result.multiplier).toBeGreaterThan(1.0);
    expect(result.multiplier).toBeLessThanOrEqual(1.5);
  });

  it("rejects when all upstream checks pass but bloom is off-season", () => {
    const result = detectLRT(
      {
        allergen_id: "cedar-juniper",
        lrt_capable: true,
        lrt_max_miles: 1000,
        lrt_source_regions: ["South Central"],
      },
      "Midwest",
      180,
      {
        isSourceInBloom: () => false, // e.g., August — cedar off-season
        applyDistanceDecay: true,
      },
    );
    expect(result.lrt_detected).toBe(false);
  });
});
