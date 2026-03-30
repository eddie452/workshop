/**
 * Leaderboard Component Tests
 *
 * Validates the full leaderboard orchestration:
 * - Trigger Champion rendering
 * - Final Four rendering with blur/unblur
 * - FDA disclaimer visibility
 * - Environmental Forecast mode
 * - First-time FDA acknowledgment gate
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
    rank: 1,
  },
  {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    elo_score: 1500,
    confidence_tier: "high",
    rank: 2,
  },
  {
    allergen_id: "ragweed",
    common_name: "Ragweed",
    category: "weed",
    elo_score: 1450,
    confidence_tier: "medium",
    rank: 3,
  },
  {
    allergen_id: "bermuda_grass",
    common_name: "Bermuda Grass",
    category: "grass",
    elo_score: 1400,
    confidence_tier: "low",
    rank: 4,
  },
  {
    allergen_id: "dust_mites",
    common_name: "Dust Mites",
    category: "indoor",
    elo_score: 1350,
    confidence_tier: "medium",
    rank: 5,
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
      expect(rows.length).toBe(1); // Only #5 (Dust Mites)
    });

    it("shows Dust Mites in full rankings", () => {
      render(<Leaderboard {...defaultProps} />);
      expect(screen.getByText("Dust Mites")).toBeDefined();
    });
  });

  describe("free-tier user (blurred Final Four)", () => {
    it("blurs the Final Four for free-tier users", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      expect(screen.getByTestId("blur-overlay")).toBeDefined();
    });

    it("shows Trigger Champion unblurred even for free tier", () => {
      render(<Leaderboard {...defaultProps} isPremium={false} />);
      expect(screen.getByTestId("trigger-champion-card")).toBeDefined();
      expect(screen.getByTestId("champion-name").textContent).toBe("Oak");
    });
  });

  describe("premium user (unblurred)", () => {
    it("does not blur the Final Four for premium users", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      expect(screen.queryByTestId("blur-overlay")).toBeNull();
    });

    it("shows all Final Four cards clearly", () => {
      render(<Leaderboard {...defaultProps} isPremium={true} />);
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(3); // #2, #3, #4
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
        screen.getByText("Environmental Forecast Mode")
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

    it("still shows FDA disclaimer in forecast mode", () => {
      render(
        <Leaderboard
          {...defaultProps}
          isEnvironmentalForecast={true}
          allergens={[]}
        />
      );
      expect(screen.getByTestId("fda-disclaimer")).toBeDefined();
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
