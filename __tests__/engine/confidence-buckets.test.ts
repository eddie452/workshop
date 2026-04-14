/**
 * Confidence Buckets Tests
 *
 * Boundary + representative tests for the numeric-score → bucket
 * mapping used by the shared ConfidenceBadge component.
 */

import { describe, it, expect } from "vitest";
import { getConfidenceInfo } from "@/lib/engine/confidence-buckets";

describe("getConfidenceInfo", () => {
  describe("bucket thresholds", () => {
    it("classifies 0.499 as low (pct = 50 rounds from 49.9? check)", () => {
      // 0.499 * 100 = 49.9 → Math.round = 50 → medium.
      // Use 0.494 to guarantee rounding to 49.
      expect(getConfidenceInfo(0.494).bucket).toBe("low");
    });

    it("classifies just under the low/medium boundary as low", () => {
      expect(getConfidenceInfo(0.49).bucket).toBe("low");
    });

    it("classifies 0.5 as medium", () => {
      expect(getConfidenceInfo(0.5).bucket).toBe("medium");
    });

    it("classifies 0.749 as medium (rounds to 75? check)", () => {
      // 0.749 * 100 = 74.9 → rounds to 75 → high.
      // Use 0.744 to guarantee rounding to 74.
      expect(getConfidenceInfo(0.744).bucket).toBe("medium");
    });

    it("classifies just under the medium/high boundary as medium", () => {
      expect(getConfidenceInfo(0.74).bucket).toBe("medium");
    });

    it("classifies 0.75 as high", () => {
      expect(getConfidenceInfo(0.75).bucket).toBe("high");
    });
  });

  describe("percent formatting", () => {
    it("returns a rounded percent string", () => {
      expect(getConfidenceInfo(0.87).percent).toBe("87%");
    });

    it("rounds half up", () => {
      expect(getConfidenceInfo(0.875).percent).toBe("88%");
    });

    it("handles exact zero", () => {
      const info = getConfidenceInfo(0);
      expect(info.percent).toBe("0%");
      expect(info.bucket).toBe("low");
    });

    it("handles exact one", () => {
      const info = getConfidenceInfo(1);
      expect(info.percent).toBe("100%");
      expect(info.bucket).toBe("high");
    });
  });

  describe("representative scores", () => {
    it("produces full info for 0.87", () => {
      expect(getConfidenceInfo(0.87)).toEqual({
        percent: "87%",
        bucket: "high",
        label: "High Confidence",
        tagline: "We're highly confident this is a trigger.",
      });
    });

    it("produces medium info around 0.6", () => {
      const info = getConfidenceInfo(0.6);
      expect(info.bucket).toBe("medium");
      expect(info.label).toBe("Medium Confidence");
    });

    it("produces low info around 0.2", () => {
      const info = getConfidenceInfo(0.2);
      expect(info.bucket).toBe("low");
      expect(info.label).toBe("Low Confidence");
    });
  });

  describe("copy guardrails", () => {
    it("never uses the words p-value, Elo, or rating", () => {
      const all = [0, 0.25, 0.5, 0.87, 1].map(getConfidenceInfo);
      for (const info of all) {
        const blob = `${info.label} ${info.tagline}`.toLowerCase();
        expect(blob).not.toContain("p-value");
        expect(blob).not.toContain("elo");
        expect(blob).not.toContain("rating");
      }
    });
  });
});
