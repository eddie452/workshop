/**
 * Gate Final Four — server-side redaction tests (#157)
 *
 * Validates that the Final Four reveal is properly gated and that free
 * users without the required referral credits receive a redacted
 * payload — defense in depth against view-source leakage.
 */

import { describe, it, expect } from "vitest";
import { gateFinalFour } from "@/lib/leaderboard/gate-final-four";
import type { RankedAllergen } from "@/components/leaderboard/types";

const ALLERGENS: RankedAllergen[] = [
  {
    allergen_id: "oak",
    common_name: "Oak",
    category: "tree",
    elo_score: 1650,
    confidence_tier: "very_high",
    score: 0.95,
    rank: 1,
  },
  {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    elo_score: 1500,
    confidence_tier: "high",
    score: 0.8,
    rank: 2,
  },
  {
    allergen_id: "ragweed",
    common_name: "Ragweed",
    category: "weed",
    elo_score: 1450,
    confidence_tier: "medium",
    score: 0.6,
    rank: 3,
  },
  {
    allergen_id: "bermuda_grass",
    common_name: "Bermuda Grass",
    category: "grass",
    elo_score: 1400,
    confidence_tier: "low",
    score: 0.3,
    rank: 4,
  },
  {
    allergen_id: "dust_mites",
    common_name: "Dust Mites",
    category: "indoor",
    elo_score: 1350,
    confidence_tier: "medium",
    score: 0.55,
    rank: 5,
  },
];

describe("gateFinalFour", () => {
  describe("unlocked paths", () => {
    it("Pro users see the full Final Four payload", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: true,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.isUnlocked).toBe(true);
      expect(result.gated).toHaveLength(3);
      result.gated.forEach((entry) => {
        expect(entry.locked).toBe(false);
        expect(entry.common_name).not.toBeNull();
        expect(entry.elo_score).not.toBeNull();
        expect(entry.confidence_tier).not.toBeNull();
      });
    });

    it("free users with referralUnlocked=true see the full payload", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 0,
        referralUnlocked: true,
      });
      expect(result.isUnlocked).toBe(true);
      expect(result.gated.every((e) => !e.locked)).toBe(true);
    });

    it("free users with >= 3 referral credits see the full payload", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 3,
        referralUnlocked: false,
      });
      expect(result.isUnlocked).toBe(true);
      expect(result.gated.every((e) => !e.locked)).toBe(true);
      expect(result.gated[0].common_name).toBe("Birch");
    });
  });

  describe("locked (redacted) paths", () => {
    it("free users with 0 credits receive a fully redacted Final Four", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.isUnlocked).toBe(false);
      expect(result.gated).toHaveLength(3);
      result.gated.forEach((entry) => {
        expect(entry.locked).toBe(true);
        expect(entry.common_name).toBeNull();
        expect(entry.elo_score).toBeNull();
        expect(entry.confidence_tier).toBeNull();
        // Numeric score is also stripped (#160 defense in depth).
        expect(entry.score).toBeNull();
      });
    });

    it("numeric score propagates through unlocked Final Four entries (#160)", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: true,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.gated[0].score).toBe(0.8);
      expect(result.gated[1].score).toBe(0.6);
      expect(result.gated[2].score).toBe(0.3);
    });

    it("free users with 1 or 2 credits still receive a redacted Final Four", () => {
      for (const count of [1, 2]) {
        const result = gateFinalFour({
          allergens: ALLERGENS,
          isPremium: false,
          referralCount: count,
          referralUnlocked: false,
        });
        expect(result.isUnlocked).toBe(false);
        expect(result.gated.every((e) => e.locked)).toBe(true);
      }
    });

    it("category is preserved in redacted entries (for silhouette rendering)", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.gated[0].category).toBe("tree");
      expect(result.gated[1].category).toBe("weed");
      expect(result.gated[2].category).toBe("grass");
    });

    it("allergen_id and rank are preserved (for stable React keys + #N labels)", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.gated.map((e) => e.rank)).toEqual([2, 3, 4]);
      expect(result.gated.map((e) => e.allergen_id)).toEqual([
        "birch",
        "ragweed",
        "bermuda_grass",
      ]);
    });
  });

  describe("client payload shaping", () => {
    it("strips the Final Four slice from allergensForClient so raw values never cross the wire", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      const names = result.allergensForClient.map((a) => a.common_name);
      // Champion + rank 5+ only
      expect(names).toEqual(["Oak", "Dust Mites"]);
      expect(names).not.toContain("Birch");
      expect(names).not.toContain("Ragweed");
      expect(names).not.toContain("Bermuda Grass");
    });

    it("preserves the champion even when locked", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.allergensForClient[0]?.common_name).toBe("Oak");
      expect(result.allergensForClient[0]?.elo_score).toBe(1650);
    });

    it("strips the Final Four from allergensForClient even when unlocked (client reads from `gated`)", () => {
      const result = gateFinalFour({
        allergens: ALLERGENS,
        isPremium: true,
        referralCount: 0,
        referralUnlocked: false,
      });
      // The Final Four data lives in `gated`; `allergensForClient` is
      // champion + ranks #5+ to avoid duplicate rendering.
      expect(result.allergensForClient.map((a) => a.rank)).toEqual([1, 5]);
    });

    it("handles empty allergens input", () => {
      const result = gateFinalFour({
        allergens: [],
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.allergensForClient).toEqual([]);
      expect(result.gated).toEqual([]);
      expect(result.isUnlocked).toBe(false);
    });

    it("handles a list with only a champion (no Final Four)", () => {
      const result = gateFinalFour({
        allergens: [ALLERGENS[0]],
        isPremium: false,
        referralCount: 0,
        referralUnlocked: false,
      });
      expect(result.allergensForClient).toHaveLength(1);
      expect(result.gated).toEqual([]);
    });
  });
});
