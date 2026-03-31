import { describe, it, expect } from "vitest";
import {
  checkCCRSGate,
  getCCRSMultiplier,
  isCockroachAllergen,
  applyCCRSGate,
  COCKROACH_ALLERGEN_ID,
} from "@/lib/engine/ccrs";
import type { CCRSInput } from "@/lib/engine/types";

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

const makeCCRSInput = (overrides: Partial<CCRSInput> = {}): CCRSInput => ({
  ccrs: 50,
  cockroach_sighting: true,
  mostly_indoors: true,
  global_severity: 2,
  ...overrides,
});

/* ------------------------------------------------------------------ */
/* checkCCRSGate                                                       */
/* ------------------------------------------------------------------ */

describe("checkCCRSGate", () => {
  it("passes when all 3 layers are satisfied", () => {
    const result = checkCCRSGate(makeCCRSInput());
    expect(result.passes).toBe(true);
    expect(result.failed_layers).toHaveLength(0);
    expect(result.multiplier).toBeGreaterThan(0);
  });

  it("blocks when global severity is 0 (layer 1 fails)", () => {
    const result = checkCCRSGate(makeCCRSInput({ global_severity: 0 }));
    expect(result.passes).toBe(false);
    expect(result.failed_layers).toContain("symptom_gate");
    expect(result.multiplier).toBe(0);
  });

  it("blocks when not mostly indoors (layer 2 fails)", () => {
    const result = checkCCRSGate(makeCCRSInput({ mostly_indoors: false }));
    expect(result.passes).toBe(false);
    expect(result.failed_layers).toContain("indoor_pattern");
    expect(result.multiplier).toBe(0);
  });

  it("blocks when CCRS score is 0 (layer 3 fails)", () => {
    const result = checkCCRSGate(makeCCRSInput({ ccrs: 0 }));
    expect(result.passes).toBe(false);
    expect(result.failed_layers).toContain("ccrs_score");
    expect(result.multiplier).toBe(0);
  });

  it("reports multiple failed layers", () => {
    const result = checkCCRSGate(
      makeCCRSInput({ global_severity: 0, mostly_indoors: false, ccrs: 0 }),
    );
    expect(result.passes).toBe(false);
    expect(result.failed_layers).toHaveLength(3);
    expect(result.failed_layers).toContain("symptom_gate");
    expect(result.failed_layers).toContain("indoor_pattern");
    expect(result.failed_layers).toContain("ccrs_score");
  });

  it("uses CCRS multiplier tiers when gate passes", () => {
    // High CCRS = high multiplier
    const highResult = checkCCRSGate(makeCCRSInput({ ccrs: 80 }));
    expect(highResult.multiplier).toBe(2.0);

    // Medium CCRS
    const medResult = checkCCRSGate(makeCCRSInput({ ccrs: 50 }));
    expect(medResult.multiplier).toBe(1.5);

    // Low CCRS
    const lowResult = checkCCRSGate(makeCCRSInput({ ccrs: 25 }));
    expect(lowResult.multiplier).toBe(1.2);

    // Minimal CCRS
    const minResult = checkCCRSGate(makeCCRSInput({ ccrs: 1 }));
    expect(minResult.multiplier).toBe(1.0);
  });
});

/* ------------------------------------------------------------------ */
/* getCCRSMultiplier                                                   */
/* ------------------------------------------------------------------ */

describe("getCCRSMultiplier", () => {
  it("returns 2.0 for CCRS >= 75", () => {
    expect(getCCRSMultiplier(75)).toBe(2.0);
    expect(getCCRSMultiplier(100)).toBe(2.0);
  });

  it("returns 1.5 for 50 <= CCRS < 75", () => {
    expect(getCCRSMultiplier(50)).toBe(1.5);
    expect(getCCRSMultiplier(74)).toBe(1.5);
  });

  it("returns 1.2 for 25 <= CCRS < 50", () => {
    expect(getCCRSMultiplier(25)).toBe(1.2);
    expect(getCCRSMultiplier(49)).toBe(1.2);
  });

  it("returns 1.0 for 1 <= CCRS < 25", () => {
    expect(getCCRSMultiplier(1)).toBe(1.0);
    expect(getCCRSMultiplier(24)).toBe(1.0);
  });

  it("returns 0.0 for CCRS = 0", () => {
    expect(getCCRSMultiplier(0)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* isCockroachAllergen                                                 */
/* ------------------------------------------------------------------ */

describe("isCockroachAllergen", () => {
  it("returns true for cockroach", () => {
    expect(isCockroachAllergen(COCKROACH_ALLERGEN_ID)).toBe(true);
  });

  it("returns false for other allergens", () => {
    expect(isCockroachAllergen("oak")).toBe(false);
    expect(isCockroachAllergen("ragweed")).toBe(false);
    expect(isCockroachAllergen("dust-mites")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* applyCCRSGate                                                       */
/* ------------------------------------------------------------------ */

describe("applyCCRSGate", () => {
  it("returns 1.0 for non-cockroach allergens (pass-through)", () => {
    const ccrsInput = makeCCRSInput({ ccrs: 0 }); // Would block cockroach
    expect(applyCCRSGate("oak", ccrsInput)).toBe(1.0);
    expect(applyCCRSGate("ragweed", ccrsInput)).toBe(1.0);
  });

  it("applies gate to cockroach allergen", () => {
    const passInput = makeCCRSInput({ ccrs: 50 });
    expect(applyCCRSGate(COCKROACH_ALLERGEN_ID, passInput)).toBe(1.5);

    const blockInput = makeCCRSInput({ ccrs: 0 });
    expect(applyCCRSGate(COCKROACH_ALLERGEN_ID, blockInput)).toBe(0);
  });
});
