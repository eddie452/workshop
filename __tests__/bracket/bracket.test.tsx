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

  // -----------------------------------------------------------------
  // Ticket #155 — animations + mobile scroll polish
  // -----------------------------------------------------------------

  it("wraps each node in an animation container with a staggered delay", () => {
    // 8 entries -> 3 rounds; round 0 has 4 matches, round 1 has 2, round 2 has 1.
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);

    // Round 0 match 0 -> delay 0ms; round 1 match 0 -> 120ms; round 2 match 0 -> 240ms.
    const r0 = screen.getByTestId("bracket-node-wrap-0-0");
    const r1 = screen.getByTestId("bracket-node-wrap-1-0");
    const r2 = screen.getByTestId("bracket-node-wrap-2-0");

    expect(r0.className).toContain("bracket-node-enter");
    expect(r1.className).toContain("bracket-node-enter");
    expect(r2.className).toContain("bracket-node-enter");

    expect(r0.getAttribute("style")).toContain("animation-delay: 0ms");
    expect(r1.getAttribute("style")).toContain("animation-delay: 120ms");
    expect(r2.getAttribute("style")).toContain("animation-delay: 240ms");
  });

  it("stacks additional per-node delay within a round", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    // Round 0 has 4 matches; match 1 should be offset by 40ms from match 0.
    const n0 = screen.getByTestId("bracket-node-wrap-0-0");
    const n1 = screen.getByTestId("bracket-node-wrap-0-1");
    expect(n0.getAttribute("style")).toContain("animation-delay: 0ms");
    expect(n1.getAttribute("style")).toContain("animation-delay: 40ms");
  });

  it("respects prefers-reduced-motion via a media query (CSS rule present)", async () => {
    // We don't import globals.css into the JSDOM render, so verify the
    // contract at the source: the bracket relies on a CSS class that is
    // zeroed out under `prefers-reduced-motion: reduce`. The rule lives
    // in app/globals.css and is asserted by reading the file directly.
    // This keeps the test stable without a real browser engine.
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const css = await readFile(
      join(process.cwd(), "app", "globals.css"),
      "utf8",
    );
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.bracket-node-enter\s*{[\s\S]*animation:\s*none/);
  });

  it("renders a mobile scroll hint when there is more than one round", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    const hint = screen.getByTestId("bracket-scroll-hint");
    expect(hint.textContent?.toLowerCase()).toContain("swipe");
    // Hidden from assistive tech — grid is already labelled.
    expect(hint.getAttribute("aria-hidden")).toBe("true");
    // Mobile-only utility class.
    expect(hint.className).toContain("sm:hidden");
  });

  it("applies horizontal scroll + snap classes to the bracket grid", () => {
    const trace = buildBracketTrace(makeEntries(8));
    render(<Bracket nodes={trace} ranked={makeRanked(8)} />);
    const grid = screen.getByTestId("bracket-grid");
    expect(grid.className).toContain("overflow-x-auto");
    expect(grid.className).toContain("snap-x");
    // Snap turns off on >= sm so desktop doesn't jitter between columns.
    expect(grid.className).toContain("sm:snap-none");
  });
});
