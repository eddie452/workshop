/**
 * Final Four Tests
 *
 * Validates the bracket-style display of allergens ranked #2-#4,
 * including the freemium gated reveal (#157) for free-tier users.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinalFour } from "@/components/leaderboard/final-four";
import type { GatedRankedAllergen } from "@/components/leaderboard/types";

const mockUnlockedAllergens: GatedRankedAllergen[] = [
  {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    elo_score: 1500,
    confidence_tier: "medium",
    rank: 2,
    locked: false,
  },
  {
    allergen_id: "ragweed",
    common_name: "Ragweed",
    category: "weed",
    elo_score: 1450,
    confidence_tier: "high",
    rank: 3,
    locked: false,
  },
  {
    allergen_id: "bermuda_grass",
    common_name: "Bermuda Grass",
    category: "grass",
    elo_score: 1400,
    confidence_tier: "low",
    rank: 4,
    locked: false,
  },
];

const mockLockedAllergens: GatedRankedAllergen[] = mockUnlockedAllergens.map(
  (a) => ({
    allergen_id: a.allergen_id,
    rank: a.rank,
    category: a.category,
    common_name: null,
    elo_score: null,
    confidence_tier: null,
    locked: true,
  }),
);

describe("FinalFour", () => {
  describe("unlocked (Pro or referral-unlocked)", () => {
    it("renders all three allergen cards", () => {
      render(
        <FinalFour allergens={mockUnlockedAllergens} isUnlocked={true} />,
      );
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(3);
    });

    it("shows allergen names", () => {
      render(
        <FinalFour allergens={mockUnlockedAllergens} isUnlocked={true} />,
      );
      const names = screen.getAllByTestId("final-four-name");
      expect(names[0].textContent).toBe("Birch");
      expect(names[1].textContent).toBe("Ragweed");
      expect(names[2].textContent).toBe("Bermuda Grass");
    });

    it("shows rank badges", () => {
      render(
        <FinalFour allergens={mockUnlockedAllergens} isUnlocked={true} />,
      );
      const ranks = screen.getAllByTestId("final-four-rank");
      expect(ranks[0].textContent).toBe("#2");
      expect(ranks[1].textContent).toBe("#3");
      expect(ranks[2].textContent).toBe("#4");
    });

    it("shows Elo scores", () => {
      render(
        <FinalFour allergens={mockUnlockedAllergens} isUnlocked={true} />,
      );
      const scores = screen.getAllByTestId("final-four-elo");
      expect(scores[0].textContent).toBe("Elo 1500");
      expect(scores[1].textContent).toBe("Elo 1450");
      expect(scores[2].textContent).toBe("Elo 1400");
    });

    it("does not show blur overlay", () => {
      render(
        <FinalFour allergens={mockUnlockedAllergens} isUnlocked={true} />,
      );
      expect(screen.queryByTestId("blur-overlay")).toBeNull();
    });

    it("does not show unlock CTA", () => {
      render(
        <FinalFour allergens={mockUnlockedAllergens} isUnlocked={true} />,
      );
      expect(screen.queryByTestId("final-four-unlock-cta")).toBeNull();
    });
  });

  describe("locked (free tier, < 3 referral credits)", () => {
    it("renders the blur overlay", () => {
      render(
        <FinalFour allergens={mockLockedAllergens} isUnlocked={false} />,
      );
      expect(screen.getByTestId("blur-overlay")).toBeDefined();
    });

    it("renders the unlock CTA card", () => {
      render(
        <FinalFour allergens={mockLockedAllergens} isUnlocked={false} />,
      );
      expect(screen.getByTestId("final-four-unlock-cta")).toBeDefined();
    });

    it("renders locked cards with '???' placeholder instead of names", () => {
      render(
        <FinalFour allergens={mockLockedAllergens} isUnlocked={false} />,
      );
      const names = screen.getAllByTestId("final-four-name");
      names.forEach((n) => expect(n.textContent).toBe("???"));
    });

    it("renders 'Elo —' placeholder instead of scores", () => {
      render(
        <FinalFour allergens={mockLockedAllergens} isUnlocked={false} />,
      );
      const elos = screen.getAllByTestId("final-four-elo");
      elos.forEach((e) => expect(e.textContent).toBe("Elo —"));
    });

    it("does not render confidence badges for locked cards", () => {
      render(
        <FinalFour allergens={mockLockedAllergens} isUnlocked={false} />,
      );
      // ConfidenceBadge uses role="img" or specific label — easier
      // proxy: locked cards carry data-locked="true" and we verify
      // no confidence tier text is leaked.
      expect(screen.queryByText(/medium|high|low/i)).toBeNull();
    });

    it("shows default headline when user has 0 referral credits", () => {
      render(
        <FinalFour
          allergens={mockLockedAllergens}
          isUnlocked={false}
          referralCount={0}
        />,
      );
      const headline = screen.getByTestId("final-four-unlock-cta-headline");
      expect(headline.textContent).toContain("Unlock");
    });

    it("shows 'Almost there' framing when user has 1 or 2 credits", () => {
      render(
        <FinalFour
          allergens={mockLockedAllergens}
          isUnlocked={false}
          referralCount={2}
        />,
      );
      const headline = screen.getByTestId("final-four-unlock-cta-headline");
      expect(headline.textContent).toContain("Almost there");
      expect(headline.textContent).toContain("1 more");
    });

    it("renders a progress indicator when user has credits", () => {
      render(
        <FinalFour
          allergens={mockLockedAllergens}
          isUnlocked={false}
          referralCount={1}
        />,
      );
      expect(screen.getByTestId("final-four-unlock-progress")).toBeDefined();
      const pips = screen.getAllByTestId("final-four-unlock-progress-pip");
      expect(pips.length).toBe(3);
      expect(pips[0].getAttribute("data-filled")).toBe("true");
      expect(pips[1].getAttribute("data-filled")).toBe("false");
    });

    it("includes invite and upgrade links", () => {
      render(
        <FinalFour allergens={mockLockedAllergens} isUnlocked={false} />,
      );
      expect(screen.getByTestId("final-four-unlock-invite")).toBeDefined();
      expect(screen.getByTestId("final-four-unlock-upgrade")).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty allergens array", () => {
      const { container } = render(
        <FinalFour allergens={[]} isUnlocked={true} />,
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders correctly with fewer than 3 allergens", () => {
      render(
        <FinalFour
          allergens={mockUnlockedAllergens.slice(0, 1)}
          isUnlocked={true}
        />,
      );
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(1);
    });
  });
});
