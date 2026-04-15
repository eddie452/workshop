/**
 * Trigger Champion Card Tests
 *
 * Validates that the #1 ranked allergen is displayed prominently
 * with the correct name, Elo score, and confidence tier badge.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TriggerChampionCard } from "@/components/leaderboard/trigger-champion-card";
import type { RankedAllergen } from "@/components/leaderboard/types";

const mockChampion: RankedAllergen = {
  allergen_id: "oak",
  common_name: "Oak",
  category: "tree",
  elo_score: 1650,
  confidence_tier: "high",
  score: 0.85,
  rank: 1,
};

describe("TriggerChampionCard", () => {
  it("renders the allergen name", () => {
    render(<TriggerChampionCard allergen={mockChampion} />);
    expect(screen.getByTestId("champion-name").textContent).toBe("Oak");
  });

  it("renders the Elo score", () => {
    render(<TriggerChampionCard allergen={mockChampion} />);
    expect(screen.getByTestId("champion-elo").textContent).toBe("Elo 1650");
  });

  it('displays "Trigger Champion" header', () => {
    render(<TriggerChampionCard allergen={mockChampion} />);
    expect(screen.getByText("Trigger Champion")).toBeDefined();
  });

  it("renders the numeric confidence badge with the score's bucket", () => {
    render(<TriggerChampionCard allergen={mockChampion} />);
    const badge = screen.getByTestId("shared-confidence-badge");
    expect(badge.getAttribute("data-bucket")).toBe("high");
    // score = 0.85 -> "85%" display
    expect(badge.textContent).toContain("85%");
  });

  it("renders the category icon", () => {
    render(<TriggerChampionCard allergen={mockChampion} />);
    const icon = screen.getByTestId("category-icon");
    expect(icon.getAttribute("data-category")).toBe("tree");
  });

  it("has the correct test ID", () => {
    render(<TriggerChampionCard allergen={mockChampion} />);
    expect(screen.getByTestId("trigger-champion-card")).toBeDefined();
  });
});
