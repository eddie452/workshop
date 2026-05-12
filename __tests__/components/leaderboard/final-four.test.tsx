/**
 * Final Four Tests
 *
 * Validates the bracket-style display of allergens ranked #2-#4.
 * After the #288 strategic shift the Final Four is no longer gated:
 * every user sees the full reveal regardless of subscription tier or
 * referral state.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinalFour } from "@/components/leaderboard/final-four";
import type { GatedRankedAllergen } from "@/components/leaderboard/types";

const mockAllergens: GatedRankedAllergen[] = [
  {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    elo_score: 1500,
    confidence_tier: "medium",
    score: 0.6,
    rank: 2,
    locked: false,
  },
  {
    allergen_id: "ragweed",
    common_name: "Ragweed",
    category: "weed",
    elo_score: 1450,
    confidence_tier: "high",
    score: 0.8,
    rank: 3,
    locked: false,
  },
  {
    allergen_id: "bermuda_grass",
    common_name: "Bermuda Grass",
    category: "grass",
    elo_score: 1400,
    confidence_tier: "low",
    score: 0.3,
    rank: 4,
    locked: false,
  },
];

describe("FinalFour (#288: ungated for all users)", () => {
  it("renders all three allergen cards", () => {
    render(<FinalFour allergens={mockAllergens} />);
    const cards = screen.getAllByTestId("final-four-card");
    expect(cards.length).toBe(3);
  });

  it("shows allergen names", () => {
    render(<FinalFour allergens={mockAllergens} />);
    const names = screen.getAllByTestId("final-four-name");
    expect(names[0].textContent).toBe("Birch");
    expect(names[1].textContent).toBe("Ragweed");
    expect(names[2].textContent).toBe("Bermuda Grass");
  });

  it("shows rank badges", () => {
    render(<FinalFour allergens={mockAllergens} />);
    const ranks = screen.getAllByTestId("final-four-rank");
    expect(ranks[0].textContent).toBe("#2");
    expect(ranks[1].textContent).toBe("#3");
    expect(ranks[2].textContent).toBe("#4");
  });

  it("shows Elo scores", () => {
    render(<FinalFour allergens={mockAllergens} />);
    const scores = screen.getAllByTestId("final-four-elo");
    expect(scores[0].textContent).toBe("Elo 1500");
    expect(scores[1].textContent).toBe("Elo 1450");
    expect(scores[2].textContent).toBe("Elo 1400");
  });

  it("does not render the blur overlay (gating removed)", () => {
    render(<FinalFour allergens={mockAllergens} />);
    expect(screen.queryByTestId("blur-overlay")).toBeNull();
  });

  it("does not render the unlock CTA (component removed in #288)", () => {
    render(<FinalFour allergens={mockAllergens} />);
    expect(screen.queryByTestId("final-four-unlock-cta")).toBeNull();
  });

  it("renders allergen thumbnails on every card", () => {
    render(<FinalFour allergens={mockAllergens} />);
    const thumbs = screen.getAllByAltText("Pollen allergen thumbnail");
    expect(thumbs.length).toBe(3);
    thumbs.forEach((img) => {
      expect(img.getAttribute("src")).toBe("/allergens/generic-plant.svg");
      expect(img.getAttribute("width")).toBe("48");
      expect(img.getAttribute("height")).toBe("48");
    });
  });

  describe("edge cases", () => {
    it("returns null for empty allergens array", () => {
      const { container } = render(<FinalFour allergens={[]} />);
      expect(container.innerHTML).toBe("");
    });

    it("renders correctly with fewer than 3 allergens", () => {
      render(<FinalFour allergens={mockAllergens.slice(0, 1)} />);
      const cards = screen.getAllByTestId("final-four-card");
      expect(cards.length).toBe(1);
    });
  });
});
