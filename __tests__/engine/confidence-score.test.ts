/**
 * Numeric Confidence Score tests (#160)
 *
 * Validates the deterministic piecewise-linear mapping from total
 * signal count to a 0–1 score, including the bucket-boundary
 * invariants that keep the engine output and the display-layer
 * `getConfidenceInfo` bucketing in sync.
 */

import { describe, it, expect } from "vitest";
import { getConfidenceScoreBySignals } from "@/lib/engine/confidence-score";
import { getConfidenceInfo } from "@/lib/engine/confidence-buckets";

describe("getConfidenceScoreBySignals", () => {
  describe("anchor points", () => {
    it("returns 0 for zero signals", () => {
      expect(getConfidenceScoreBySignals(0)).toBe(0);
    });

    it("returns 0.5 at the low -> medium boundary (7 signals)", () => {
      expect(getConfidenceScoreBySignals(7)).toBe(0.5);
    });

    it("returns 0.75 at the medium -> high boundary (14 signals)", () => {
      expect(getConfidenceScoreBySignals(14)).toBe(0.75);
    });

    it("returns 0.9 at the very_high tier threshold (30 signals)", () => {
      expect(getConfidenceScoreBySignals(30)).toBeCloseTo(0.9, 10);
    });

    it("returns 1.0 at the saturation anchor (50 signals)", () => {
      expect(getConfidenceScoreBySignals(50)).toBe(1);
    });

    it("caps at 1.0 beyond the saturation anchor", () => {
      expect(getConfidenceScoreBySignals(1000)).toBe(1);
    });
  });

  describe("clamping and defensive inputs", () => {
    it("clamps negative signal counts to 0", () => {
      expect(getConfidenceScoreBySignals(-5)).toBe(0);
    });

    it("treats NaN as zero", () => {
      expect(getConfidenceScoreBySignals(NaN)).toBe(0);
    });

    it("treats Infinity as saturated (1.0)", () => {
      expect(getConfidenceScoreBySignals(Infinity)).toBe(1);
    });

    it("returns values strictly within [0, 1] for a wide sweep", () => {
      for (let n = -10; n <= 200; n++) {
        const score = getConfidenceScoreBySignals(n);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("determinism", () => {
    it("is a pure function — same input yields same output across calls", () => {
      const inputs = [0, 1, 7, 8, 14, 15, 30, 31, 50, 99];
      for (const n of inputs) {
        const a = getConfidenceScoreBySignals(n);
        const b = getConfidenceScoreBySignals(n);
        expect(a).toBe(b);
      }
    });
  });

  describe("bucket-boundary coherence with getConfidenceInfo (#160)", () => {
    // The whole point of the derivation is that the engine's numeric
    // score lines up with the display-layer bucket thresholds
    // (>= 0.5 medium, >= 0.75 high). These tests pin the boundaries.

    it("score just below 0.5 buckets as low (0.499)", () => {
      expect(getConfidenceInfo(0.499).bucket).toBe("low");
    });

    it("score exactly 0.5 buckets as medium", () => {
      expect(getConfidenceInfo(0.5).bucket).toBe("medium");
    });

    it("score just below 0.75 buckets as medium (0.749)", () => {
      expect(getConfidenceInfo(0.749).bucket).toBe("medium");
    });

    it("score exactly 0.75 buckets as high", () => {
      expect(getConfidenceInfo(0.75).bucket).toBe("high");
    });

    it("engine emits a medium-bucket score at 7 signals", () => {
      const score = getConfidenceScoreBySignals(7);
      expect(getConfidenceInfo(score).bucket).toBe("medium");
    });

    it("engine emits a high-bucket score at 14 signals", () => {
      const score = getConfidenceScoreBySignals(14);
      expect(getConfidenceInfo(score).bucket).toBe("high");
    });

    it("engine emits a low-bucket score just below the medium threshold (6 signals)", () => {
      // 6 signals -> 6/7 * 0.5 ≈ 0.4286 -> low bucket
      const score = getConfidenceScoreBySignals(6);
      expect(score).toBeLessThan(0.5);
      expect(getConfidenceInfo(score).bucket).toBe("low");
    });

    it("engine emits a medium-bucket score just below the high threshold (13 signals)", () => {
      // 13 signals -> between 7 and 14 anchors; still < 0.75
      const score = getConfidenceScoreBySignals(13);
      expect(score).toBeGreaterThanOrEqual(0.5);
      expect(score).toBeLessThan(0.75);
      expect(getConfidenceInfo(score).bucket).toBe("medium");
    });
  });
});
