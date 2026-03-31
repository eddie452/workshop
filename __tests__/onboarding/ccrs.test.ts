/**
 * CCRS Derivation Tests
 */

import { describe, it, expect } from "vitest";
import { deriveCCRS } from "@/lib/onboarding/ccrs";

describe("deriveCCRS", () => {
  it("returns a score between 0 and 100", () => {
    const score = deriveCCRS({
      region: "Southeast",
      yearBuilt: 1960,
      homeType: "apartment_high_rise",
      cockroachSighting: true,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("gives higher score for Southeast + old apartment + cockroach sighting", () => {
    const highRisk = deriveCCRS({
      region: "Southeast",
      yearBuilt: 1950,
      homeType: "apartment_high_rise",
      cockroachSighting: true,
    });
    const lowRisk = deriveCCRS({
      region: "Northwest",
      yearBuilt: 2020,
      homeType: "single_family",
      cockroachSighting: false,
    });
    expect(highRisk).toBeGreaterThan(lowRisk);
  });

  it("cockroach sighting adds 25 points", () => {
    const withSighting = deriveCCRS({
      region: "Midwest",
      yearBuilt: 2000,
      homeType: "single_family",
      cockroachSighting: true,
    });
    const withoutSighting = deriveCCRS({
      region: "Midwest",
      yearBuilt: 2000,
      homeType: "single_family",
      cockroachSighting: false,
    });
    expect(withSighting - withoutSighting).toBe(25);
  });

  it("handles null region with default base", () => {
    const score = deriveCCRS({
      region: null,
      yearBuilt: null,
      homeType: null,
      cockroachSighting: false,
    });
    // Default region (15) + unknown age (10) + unknown type (10) = 35
    expect(score).toBe(35);
  });

  it("caps score at 100", () => {
    const score = deriveCCRS({
      region: "Southeast",
      yearBuilt: 1940,
      homeType: "apartment_high_rise",
      cockroachSighting: true,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("older homes score higher for age component", () => {
    const old = deriveCCRS({
      region: "Midwest",
      yearBuilt: 1950,
      homeType: "single_family",
      cockroachSighting: false,
    });
    const newer = deriveCCRS({
      region: "Midwest",
      yearBuilt: 2020,
      homeType: "single_family",
      cockroachSighting: false,
    });
    expect(old).toBeGreaterThan(newer);
  });

  it("apartments score higher than single family", () => {
    const apartment = deriveCCRS({
      region: "Northeast",
      yearBuilt: 2000,
      homeType: "apartment_high_rise",
      cockroachSighting: false,
    });
    const singleFamily = deriveCCRS({
      region: "Northeast",
      yearBuilt: 2000,
      homeType: "single_family",
      cockroachSighting: false,
    });
    expect(apartment).toBeGreaterThan(singleFamily);
  });
});
