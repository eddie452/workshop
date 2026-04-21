/**
 * BracketConnector / bracket lines — tests (ticket #180)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bracket } from "@/components/bracket/bracket";
import { BracketConnector } from "@/components/bracket/bracket-lines";
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

function makeRanked(n: number): RankedAllergen[] {
  return Array.from({ length: n }, (_, i) => ({
    allergen_id: `a-${i + 1}`,
    common_name: `Allergen ${i + 1}`,
    category: "pollen" as RankedAllergen["category"],
    elo_score: 1000 - i * 10,
    confidence_tier: "medium",
    score: 0.6,
    discriminative: 0.5,
    posterior: 0.8,
    rank: i + 1,
  }));
}

describe("BracketConnector (unit)", () => {
  it("renders nothing when sourceMatchCount is 0", () => {
    const { container } = render(<BracketConnector sourceMatchCount={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when sourceMatchCount is 1 (no pairs)", () => {
    const { container } = render(<BracketConnector sourceMatchCount={1} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders 1 pair for sourceMatchCount=2", () => {
    render(<BracketConnector sourceMatchCount={2} />);
    expect(screen.getByTestId("bracket-connector")).toBeDefined();
    expect(screen.getByTestId("bracket-connector-pair-0")).toBeDefined();
    expect(screen.queryByTestId("bracket-connector-pair-1")).toBeNull();
  });

  it("renders 2 pairs for sourceMatchCount=4", () => {
    render(<BracketConnector sourceMatchCount={4} />);
    expect(screen.getByTestId("bracket-connector-pair-0")).toBeDefined();
    expect(screen.getByTestId("bracket-connector-pair-1")).toBeDefined();
    expect(screen.queryByTestId("bracket-connector-pair-2")).toBeNull();
  });

  it("is aria-hidden for screen readers", () => {
    render(<BracketConnector sourceMatchCount={2} />);
    const connector = screen.getByTestId("bracket-connector");
    expect(connector.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Bracket with lines (integration)", () => {
  it.each([
    // [bracketSize, totalRounds, connectorCount]
    // 8 entries: 3 rounds, connectors between r0-r1 (4 matches) and r1-r2 (2 matches) = 2 connectors
    [8, 2],
    // 16 entries: 4 rounds, connectors between r0-r1, r1-r2, r2-r3 = 3 connectors
    [16, 3],
    // 32 entries: 5 rounds, connectors between r0-r1, r1-r2, r2-r3, r3-r4 = 4 connectors
    [32, 4],
  ])(
    "renders %i-entry bracket with %i connector columns",
    (size, expectedConnectors) => {
      const trace = buildBracketTrace(makeEntries(size));
      render(<Bracket nodes={trace} ranked={makeRanked(size)} />);
      const connectors = screen.getAllByTestId("bracket-connector");
      expect(connectors).toHaveLength(expectedConnectors);
    },
  );

  it("8-entry bracket: connector pair counts are [2, 1]", () => {
    // Round 0 has 4 matches -> 2 pairs, Round 1 has 2 matches -> 1 pair
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    const connectors = screen.getAllByTestId("bracket-connector");
    // First connector (round 0 -> 1): 4 source matches = 2 pairs
    expect(
      connectors[0].querySelectorAll("[data-testid^='bracket-connector-pair-']")
        .length,
    ).toBe(2);
    // Second connector (round 1 -> 2): 2 source matches = 1 pair
    expect(
      connectors[1].querySelectorAll("[data-testid^='bracket-connector-pair-']")
        .length,
    ).toBe(1);
  });

  it("16-entry bracket: connector pair counts are [4, 2, 1]", () => {
    const trace = buildBracketTrace(makeEntries(16));
    render(<Bracket nodes={trace} ranked={makeRanked(16)} />);
    const connectors = screen.getAllByTestId("bracket-connector");
    expect(
      connectors[0].querySelectorAll("[data-testid^='bracket-connector-pair-']")
        .length,
    ).toBe(4);
    expect(
      connectors[1].querySelectorAll("[data-testid^='bracket-connector-pair-']")
        .length,
    ).toBe(2);
    expect(
      connectors[2].querySelectorAll("[data-testid^='bracket-connector-pair-']")
        .length,
    ).toBe(1);
  });

  it("does not render connectors when showLines is false", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(
      <Bracket nodes={trace} ranked={makeRanked(8)} showLines={false} />,
    );
    expect(screen.queryByTestId("bracket-connector")).toBeNull();
  });

  it("does not render connectors for empty bracket", () => {
    render(<Bracket nodes={[]} ranked={[]} />);
    expect(screen.queryByTestId("bracket-connector")).toBeNull();
  });

  it("connector elements use champ-blue border color", () => {
    render(<BracketConnector sourceMatchCount={2} />);
    const pair = screen.getByTestId("bracket-connector-pair-0");
    const divs = pair.querySelectorAll("div");
    // Each elbow div should have the border-champ-blue class
    for (const div of divs) {
      expect(div.className).toContain("border-champ-blue");
    }
  });
});

describe("BracketConnector alignment (ticket #238)", () => {
  it("pair wrappers use flex-1 so heights scale with node sizes", () => {
    render(<BracketConnector sourceMatchCount={4} />);
    const pair0 = screen.getByTestId("bracket-connector-pair-0");
    const pair1 = screen.getByTestId("bracket-connector-pair-1");
    // Dynamic elbow heights (Fix 1) — pair wrappers must flex to span
    // their feeder pair's vertical extent instead of using fixed `h-8`.
    expect(pair0.className).toContain("flex-1");
    expect(pair1.className).toContain("flex-1");
  });

  it("elbow halves use flex-1 (no fixed h-8 pixel height)", () => {
    render(<BracketConnector sourceMatchCount={2} />);
    const pair = screen.getByTestId("bracket-connector-pair-0");
    const halves = pair.querySelectorAll("div");
    for (const half of halves) {
      expect(half.className).toContain("flex-1");
      // Guard against regression to the fixed h-8 that caused #238.
      expect(half.className).not.toContain("h-8");
    }
  });

  it("connector column matches source gap-3 and uses self-stretch for parent-height alignment", () => {
    render(<BracketConnector sourceMatchCount={4} />);
    const connector = screen.getByTestId("bracket-connector");
    // `gap-3` aligns pair boundaries with the source node stack's gap.
    expect(connector.className).toContain("gap-3");
    // `self-stretch` lets flex-row parent size the connector to the
    // node stack's height (Fix 2 — explicit positioning strategy).
    expect(connector.className).toContain("self-stretch");
    // `justify-around` was the old alignment bug — must not return.
    expect(connector.className).not.toContain("justify-around");
  });

  it("connector receives a fade-in animation class for reveal sync (Fix 3)", () => {
    render(<BracketConnector sourceMatchCount={2} animationDelayMs={540} />);
    const connector = screen.getByTestId("bracket-connector");
    expect(connector.className).toContain("bracket-connector-enter");
    expect(connector.getAttribute("style")).toContain("540ms");
  });

  it("bracket places connector as sibling of node stack, not of the label", () => {
    // Alignment anchor: connector must live inside the flex-row with the
    // node stack so `items-stretch` makes connector height == stack
    // height. If the connector regressed to being a sibling of the
    // round label (h3), the stack's `data-testid` wrapper would not be
    // the connector's direct parent.
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    const connectors = screen.getAllByTestId("bracket-connector");
    for (const connector of connectors) {
      const row = connector.parentElement;
      expect(row).not.toBeNull();
      // The flex-row wrapper should contain both the node stack and
      // the connector as siblings.
      const stack = row?.querySelector("[data-testid^='bracket-node-stack-']");
      expect(stack).not.toBeNull();
    }
  });
});
