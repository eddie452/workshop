/**
 * Bracket — container tests (ticket #179)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bracket } from "@/components/bracket/bracket";
import { buildBracketTrace } from "@/lib/engine/tournament";
import type { TournamentEntry } from "@/lib/engine/types";
import type { RankedAllergen } from "@/components/leaderboard/types";

function makeEntries(n: number): TournamentEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    allergen_id: `a-${i + 1}`,
    common_name: `Allergen ${i + 1}`,
    category: "pollen",
    composite_score: 1000 - i * 10,
    tier: "low" as const,
  }));
}

function makeRanked(
  n: number,
  opts: { championPosterior?: number } = {},
): RankedAllergen[] {
  return Array.from({ length: n }, (_, i) => ({
    allergen_id: `a-${i + 1}`,
    common_name: `Allergen ${i + 1}`,
    category: "pollen" as RankedAllergen["category"],
    elo_score: 1000 - i * 10,
    confidence_tier: "medium",
    score: 0.6,
    discriminative: 0.5,
    posterior: i === 0 ? opts.championPosterior ?? 0.8 : 0.5,
    rank: i + 1,
  }));
}

describe("Bracket", () => {
  it.each([
    [8, 3],
    [16, 4],
    [32, 5],
  ])("renders %i columns for an %i-entry bracket", (size, totalRounds) => {
    const trace = buildBracketTrace(makeEntries(size));
    render(<Bracket nodes={trace} ranked={makeRanked(size)} />);
    for (let r = 0; r < totalRounds; r++) {
      expect(screen.getByTestId(`bracket-column-${r}`)).toBeDefined();
    }
    expect(
      screen.queryByTestId(`bracket-column-${totalRounds}`),
    ).toBeNull();
  });

  it("labels the final round 'Final'", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    // Final round is index 2 for 8-entry bracket
    expect(
      screen.getByTestId("bracket-round-label-2").textContent,
    ).toBe("Final");
  });

  it("labels a 16-entry bracket with Round of 16 / QF / SF / Final", () => {
    const trace = buildBracketTrace(makeEntries(16));
    render(<Bracket nodes={trace} ranked={makeRanked(16)} />);
    expect(screen.getByTestId("bracket-round-label-0").textContent).toBe(
      "Round of 16",
    );
    expect(screen.getByTestId("bracket-round-label-1").textContent).toBe(
      "Quarter-finals",
    );
    expect(screen.getByTestId("bracket-round-label-2").textContent).toBe(
      "Semi-finals",
    );
    expect(screen.getByTestId("bracket-round-label-3").textContent).toBe(
      "Final",
    );
  });

  it("renders the FDA disclaimer", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    const disclaimer = screen.getByTestId("bracket-fda-disclaimer");
    expect(disclaimer.textContent).toContain("Predicted Triggers");
    expect(disclaimer.textContent).toContain("Not a Diagnosis");
  });

  it("renders the 'keep tracking' affordance when the champion posterior is below 0.5", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(
      <Bracket
        nodes={trace}
        ranked={makeRanked(8, { championPosterior: 0.3 })}
      />,
    );
    const banner = screen.getByTestId("bracket-low-confidence");
    expect(banner.textContent?.toLowerCase()).toContain("low confidence");
    expect(banner.textContent?.toLowerCase()).toContain("keep tracking");
  });

  it("does NOT render the low-confidence banner when the champion posterior is high", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(
      <Bracket
        nodes={trace}
        ranked={makeRanked(8, { championPosterior: 0.9 })}
      />,
    );
    expect(screen.queryByTestId("bracket-low-confidence")).toBeNull();
  });

  it("renders an empty state and does not crash when nodes is empty", () => {
    render(<Bracket nodes={[]} ranked={[]} />);
    expect(screen.getByTestId("bracket-empty")).toBeDefined();
    expect(screen.queryByTestId("bracket")).toBeNull();
  });
});
