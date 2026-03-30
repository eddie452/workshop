/**
 * Final Four Tests
 *
 * Validates the bracket-style display of allergens ranked #2-#4,
 * including blur behavior for free-tier vs premium users.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinalFour } from "@/components/leaderboard/final-four";
import type { RankedAllergen } from "@/components/leaderboard/types";

const mockAllergens: RankedAllergen[] = [
  {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    elo_score: 1500,
    confidence_tier: "medium",
    rank: 2,
  },
  {
    allergen_id: "ragweed",
    common_name: "Ragweed",
    category: "weed",
    elo_score: 1450,
    confidence_tier: "high",
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
];

describe("FinalFour", () => {
  describe("premium user (unblurred)", () => {
    it("renders all three allergen cards", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={false} />);
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(3);
    });

    it("shows allergen names", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={false} />);
      const names = screen.getAllByTestId("final-four-name");
      expect(names[0].textContent).toBe("Birch");
      expect(names[1].textContent).toBe("Ragweed");
      expect(names[2].textContent).toBe("Bermuda Grass");
    });

    it("shows rank badges", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={false} />);
      const ranks = screen.getAllByTestId("final-four-rank");
      expect(ranks[0].textContent).toBe("#2");
      expect(ranks[1].textContent).toBe("#3");
      expect(ranks[2].textContent).toBe("#4");
    });

    it("shows Elo scores", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={false} />);
      const scores = screen.getAllByTestId("final-four-elo");
      expect(scores[0].textContent).toBe("Elo 1500");
      expect(scores[1].textContent).toBe("Elo 1450");
      expect(scores[2].textContent).toBe("Elo 1400");
    });

    it("does not show blur overlay", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={false} />);
      expect(screen.queryByTestId("blur-overlay")).toBeNull();
    });
  });

  describe("free-tier user (blurred)", () => {
    it("renders the blur overlay", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={true} />);
      expect(screen.getByTestId("blur-overlay")).toBeDefined();
    });

    it("shows the lock overlay with upgrade message", () => {
      render(<FinalFour allergens={mockAllergens} isBlurred={true} />);
      expect(screen.getByTestId("blur-lock-overlay")).toBeDefined();
      expect(
        screen.getByText("Upgrade to Madness+ to reveal")
      ).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty allergens array", () => {
      const { container } = render(
        <FinalFour allergens={[]} isBlurred={false} />
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders correctly with fewer than 3 allergens", () => {
      render(
        <FinalFour allergens={mockAllergens.slice(0, 1)} isBlurred={false} />
      );
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(1);
    });
  });
});
