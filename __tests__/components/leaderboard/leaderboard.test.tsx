/**
 * Leaderboard Component Tests
 *
 * Validates the full leaderboard orchestration after the #288
 * strategic shift removed premium gating:
 * - Trigger Champion rendering
 * - Final Four rendering (always unlocked)
 * - Full Rankings rendering (always unlocked)
 * - FDA disclaimer visibility
 * - Environmental Forecast mode
 * - First-time FDA acknowledgment gate
 *
 * Regression for #288: a free-tier user (`isPremium: false`) sees the
 * full Final Four and Full Rankings — no blur overlays or upgrade CTAs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import { FDA_DISCLAIMER_LABEL } from "@/components/shared/fda-disclaimer";
import type { RankedAllergen } from "@/components/leaderboard/types";

/* ------------------------------------------------------------------ */
/* Mock Supabase client (required by DisclaimerModal)                  */
/* ------------------------------------------------------------------ */

const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
});

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const mockAllergens: RankedAllergen[] = [
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
  {
    allergen_id: "cat_dander",
    common_name: "Cat Dander",
    category: "indoor",
    elo_score: 1300,
    confidence_tier: "low",
    score: 0.25,
    rank: 6,
  },
];

const defaultProps = {
  allergens: mockAllergens,
  isPremium: false,
  isEnvironmentalForecast: false,
  fdaAcknowledged: true,
  userId: "user-123",
};

describe("Leaderboard", () => {
  describe("'Your Allergen Leaderboard' title placement (#276)", () => {
    it("renders the title inline when Full Rankings are shown inline (default)", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(
        screen.getByRole("heading", { level: 1, name: /your allergen leaderboard/i }),
      ).toBeDefined();
    });

    it("does NOT render the title inline when showFullRankings=false (dashboard case — title moves to FullRankings reveal block)", () => {
      render(<Leaderboard {...defaultProps} showFullRankings={false} />);
      expect(
        screen.queryByRole("heading", { level: 1, name: /your allergen leaderboard/i }),
      ).toBeNull();
      // Champion still rendered — it's no longer orphaned below an unused title.
      expect(screen.getByTestId("trigger-champion-card")).toBeDefined();
    });
  });

  describe("normal mode (acknowledged, has data)", () => {
    it("renders the leaderboard container", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByTestId("leaderboard")).toBeDefined();
    });

    it("renders the Trigger Champion card with correct name", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByTestId("trigger-champion-card")).toBeDefined();
      expect(screen.getByTestId("champion-name").textContent).toBe("Oak");
    });

    it("renders the FDA disclaimer", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByText(FDA_DISCLAIMER_LABEL)).toBeDefined();
      expect(screen.getByTestId("fda-disclaimer")).toBeDefined();
    });

    it("renders the Final Four section", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByText("Final Four")).toBeDefined();
    });

    it("renders the full rankings section for allergens beyond top 4", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByText("Full Rankings")).toBeDefined();
      const rows = screen.getAllByTestId("ranked-allergen-row");
      expect(rows.length).toBe(2); // #5 (Dust Mites) and #6 (Cat Dander)
    });

    it("shows Dust Mites in full rankings", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByText("Dust Mites")).toBeDefined();
    });

    it("renders allergen thumbnails in the champion card and full rankings rows", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      const thumbs = screen.getAllByAltText("Pollen allergen thumbnail");
      expect(thumbs.length).toBeGreaterThanOrEqual(3);
      thumbs.forEach((img) => {
        expect(img.getAttribute("src")).toBe("/allergens/generic-plant.svg");
      });
    });
  });

  describe("ungated for free tier (#288 regression)", () => {
    it("does NOT blur the Final Four for free-tier users", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      expect(screen.queryByTestId("blur-overlay")).toBeNull();
    });

    it("renders all Final Four cards for free-tier users", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(3);
    });

    it("renders Final Four names (no '???' redaction) for free-tier users", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      const names = screen.getAllByTestId("final-four-name").map((n) => n.textContent);
      expect(names).toEqual(["Birch", "Ragweed", "Bermuda Grass"]);
    });

    it("renders Full Rankings scores for free-tier users (no upgrade lock)", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      expect(screen.getByText("1350")).toBeDefined();
      expect(screen.getByText("1300")).toBeDefined();
      const scoreDetails = screen.getAllByTestId("ranking-score-details");
      expect(scoreDetails.length).toBe(2);
    });

    it("does not show lock icons for free-tier users", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      expect(screen.queryByTestId("ranking-score-locked")).toBeNull();
    });

    it("does not show upgrade CTA under Full Rankings for any tier", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      expect(screen.queryByTestId("rankings-upgrade-cta")).toBeNull();
    });

    it("free-tier user with referralUnlocked=false, referralCount=0 still sees the full Final Four (#288)", () => {
      // Regression pin: assert the strictest possible non-premium state
      // (no subscription, no referral unlock, zero invites) still sees
      // the full reveal. Any future revert of gating would fail here.
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(3);
      expect(screen.queryByTestId("blur-overlay")).toBeNull();
      expect(screen.queryByTestId("final-four-unlock-cta")).toBeNull();
      expect(screen.queryByTestId("rankings-upgrade-cta")).toBeNull();
    });
  });

  describe("premium user (parity with free tier — same render)", () => {
    it("shows full scores and confidence for ranks #5+", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      expect(screen.getByText("1350")).toBeDefined();
      expect(screen.getByText("1300")).toBeDefined();
      const scoreDetails = screen.getAllByTestId("ranking-score-details");
      expect(scoreDetails.length).toBe(2);
    });

    it("does not show lock icons for premium users", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      expect(screen.queryByTestId("ranking-score-locked")).toBeNull();
    });

    it("does not show the rankings upgrade CTA for premium users", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      expect(screen.queryByTestId("rankings-upgrade-cta")).toBeNull();
    });

    it("shows all Final Four cards clearly", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(3);
    });
  });

  describe("Environmental Forecast mode", () => {
    it("shows Environmental Forecast when severity = 0", () => {
      render(
        <Leaderboard
          {...defaultProps}
          isEnvironmentalForecast={true}
          allergens={[]}
        />
      );
      expect(screen.getByTestId("environmental-forecast")).toBeDefined();
      expect(
        screen.getByText("Environmental Forecast")
      ).toBeDefined();
    });

    it("does not show Trigger Champion in forecast mode", () => {
      render(
        <Leaderboard
          {...defaultProps}
          isEnvironmentalForecast={true}
          allergens={[]}
        />
      );
      expect(screen.queryByTestId("trigger-champion-card")).toBeNull();
    });
  });

  describe("FDA disclaimer gate", () => {
    it("shows disclaimer modal when not yet acknowledged", () => {
      render(<Leaderboard {...defaultProps} fdaAcknowledged={false} />);
      expect(screen.getByTestId("disclaimer-modal")).toBeDefined();
      expect(screen.queryByTestId("leaderboard")).toBeNull();
    });

    it("shows leaderboard when already acknowledged", () => {
      render(<Leaderboard {...defaultProps} fdaAcknowledged={true} />);
      expect(screen.queryByTestId("disclaimer-modal")).toBeNull();
      expect(screen.getByTestId("leaderboard")).toBeDefined();
    });
  });

  describe("edge case — exactly 5 allergens (single #5 row)", () => {
    const fiveAllergens: RankedAllergen[] = mockAllergens.slice(0, 5);

    it("shows the single #5 row with score for any tier", () => {
      render(
        <Leaderboard
          {...defaultProps}
          allergens={fiveAllergens}
          isPremium={false}
        />
      );
      expect(screen.getByText("Dust Mites")).toBeDefined();
      const rows = screen.getAllByTestId("ranked-allergen-row");
      expect(rows.length).toBe(1);
      expect(screen.getByText("1350")).toBeDefined();
      expect(screen.queryByTestId("ranking-score-locked")).toBeNull();
      expect(screen.queryByTestId("rankings-upgrade-cta")).toBeNull();
    });
  });

  describe("with only champion (no Final Four)", () => {
    it("renders champion without Final Four section", () => {
      render(
        <Leaderboard
          {...defaultProps}
          allergens={[mockAllergens[0]]}
        />
      );
      expect(screen.getByTestId("trigger-champion-card")).toBeDefined();
      expect(screen.queryByText("Final Four")).toBeNull();
      expect(screen.queryByText("Full Rankings")).toBeNull();
    });
  });
});
