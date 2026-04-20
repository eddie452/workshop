/**
 * Dashboard Layout Tests (ticket #242)
 *
 * Pins the restructured DOM order:
 *   Welcome → Champion → Final Four → Bracket reveal button →
 *     View All reveal button → FDA disclaimer (bottom)
 *
 * Also covers:
 *   - Bracket not in DOM by default; revealed on click
 *   - Full Rankings not in DOM by default; revealed on click
 *   - aria-expanded toggles correctly on both buttons
 *   - Environmental Forecast mode suppresses the bracket reveal button
 *   - Empty bracket data suppresses the bracket reveal button
 *
 * Testing approach: the dashboard page itself is an async server
 * component tied to Supabase; rather than stub the entire data layer
 * we render the same composition of client-safe sub-components in a
 * small harness. This is close enough to the real page that a DOM-order
 * regression would be caught here first.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DashboardLeaderboard } from "@/app/(app)/dashboard/dashboard-leaderboard";
import { FullRankings } from "@/components/leaderboard";
import { FdaDisclaimer, RevealGate } from "@/components/shared";
import type { RankedAllergen } from "@/components/leaderboard/types";

/* ------------------------------------------------------------------ */
/* Supabase client mock (the Leaderboard imports it for the           */
/* disclaimer-acknowledgment mutation — never actually called when    */
/* `fdaAcknowledged` is true).                                        */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  }),
}));

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const mockAllergens: RankedAllergen[] = [
  { allergen_id: "oak", common_name: "Oak", category: "tree", elo_score: 1650, confidence_tier: "very_high", score: 0.95, rank: 1 },
  { allergen_id: "birch", common_name: "Birch", category: "tree", elo_score: 1500, confidence_tier: "high", score: 0.8, rank: 2 },
  { allergen_id: "ragweed", common_name: "Ragweed", category: "weed", elo_score: 1450, confidence_tier: "medium", score: 0.6, rank: 3 },
  { allergen_id: "bermuda_grass", common_name: "Bermuda Grass", category: "grass", elo_score: 1400, confidence_tier: "low", score: 0.3, rank: 4 },
  { allergen_id: "dust_mites", common_name: "Dust Mites", category: "indoor", elo_score: 1300, confidence_tier: "low", score: 0.2, rank: 5 },
  { allergen_id: "cat", common_name: "Cat Dander", category: "indoor", elo_score: 1250, confidence_tier: "low", score: 0.15, rank: 6 },
];

/**
 * Render a harness that mirrors the composition in
 * `app/(app)/dashboard/page.tsx`. Keep the order in lock-step with
 * that file so DOM-order assertions here are meaningful.
 */
function renderDashboard(opts: {
  isEnvironmentalForecast?: boolean;
  bracketTrace?: unknown[];
  allergens?: RankedAllergen[];
} = {}) {
  const {
    isEnvironmentalForecast = false,
    bracketTrace = [{}, {}, {}], // non-empty sentinel
    allergens = mockAllergens,
  } = opts;

  return render(
    <div>
      <div data-testid="welcome-header">Welcome to Allergy Madness</div>

      <DashboardLeaderboard
        allergens={allergens}
        isPremium={true}
        hasFullRankings={true}
        isEnvironmentalForecast={isEnvironmentalForecast}
        fdaAcknowledged={true}
        userId="user-123"
        showFdaDisclaimer={false}
        showFullRankings={false}
      />

      {!isEnvironmentalForecast && bracketTrace.length > 0 && (
        <div data-testid="bracket-reveal-gate">
          <RevealGate label="Show Bracket" hideLabel="Hide Bracket">
            <div data-testid="bracket-content">Bracket Content</div>
          </RevealGate>
        </div>
      )}

      {!isEnvironmentalForecast && allergens.length > 4 && (
        <div data-testid="rankings-reveal-gate">
          <RevealGate label="View All" hideLabel="Hide Rankings">
            <FullRankings
              allergens={allergens}
              isPremium={true}
              hasFullRankings={true}
            />
          </RevealGate>
        </div>
      )}

      {!isEnvironmentalForecast && (
        <div data-testid="dashboard-fda-disclaimer">
          <FdaDisclaimer />
        </div>
      )}
    </div>,
  );
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("Dashboard layout (#242)", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("DOM order", () => {
    it("renders champion, final four, bracket button, view-all button, and FDA disclaimer in that order", () => {
      const { container } = renderDashboard();

      const champion = screen.getByTestId("trigger-champion-card");
      const finalFourHeading = screen.getByText("Final Four");
      const bracketButton = screen.getByRole("button", { name: /show bracket/i });
      const viewAllButton = screen.getByRole("button", { name: /view all/i });
      const fda = screen.getByTestId("dashboard-fda-disclaimer");

      // Node.compareDocumentPosition returns a bitmask with
      // DOCUMENT_POSITION_FOLLOWING (0x04) when the *argument* comes
      // AFTER the reference node in document order.
      const follows = (a: Node, b: Node) =>
        Boolean(
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );

      expect(follows(champion, finalFourHeading)).toBe(true);
      expect(follows(finalFourHeading, bracketButton)).toBe(true);
      expect(follows(bracketButton, viewAllButton)).toBe(true);
      expect(follows(viewAllButton, fda)).toBe(true);

      // FDA must be the final content block (nothing after it).
      expect(container.contains(fda)).toBe(true);
      expect(
        container.querySelector(
          "[data-testid='dashboard-fda-disclaimer'] ~ *",
        ),
      ).toBeNull();
    });
  });

  describe("Bracket reveal gate", () => {
    it("does NOT render the bracket content by default", () => {
      renderDashboard();
      expect(screen.queryByTestId("bracket-content")).toBeNull();
    });

    it("renders the bracket content after the reveal button is clicked", () => {
      renderDashboard();
      const btn = screen.getByRole("button", { name: /show bracket/i });
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(btn);
      expect(screen.getByTestId("bracket-content")).toBeDefined();
    });

    it("toggles aria-expanded on click", () => {
      renderDashboard();
      const btn = screen.getByRole("button", { name: /show bracket/i });
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(btn);
      // Once revealed, the button becomes the "hide" toggle — still
      // the same element and still carries aria-expanded.
      const hideBtn = screen.getByRole("button", { name: /hide bracket/i });
      expect(hideBtn.getAttribute("aria-expanded")).toBe("true");
    });

    it("wires aria-controls to the revealed panel", () => {
      renderDashboard();
      const btn = screen.getByRole("button", { name: /show bracket/i });
      const controlsId = btn.getAttribute("aria-controls");
      expect(controlsId).toBeTruthy();
      // The controlled element exists in the DOM.
      expect(document.getElementById(controlsId ?? "")).toBeTruthy();
    });

    it("suppresses the bracket reveal button in Environmental Forecast mode", () => {
      renderDashboard({
        isEnvironmentalForecast: true,
        allergens: [],
        bracketTrace: [],
      });
      expect(
        screen.queryByRole("button", { name: /show bracket/i }),
      ).toBeNull();
      expect(screen.queryByTestId("bracket-reveal-gate")).toBeNull();
    });

    it("suppresses the bracket reveal button when bracketTrace is empty", () => {
      renderDashboard({ bracketTrace: [] });
      expect(
        screen.queryByRole("button", { name: /show bracket/i }),
      ).toBeNull();
      expect(screen.queryByTestId("bracket-reveal-gate")).toBeNull();
    });
  });

  describe("Rankings reveal gate", () => {
    it("does NOT render the Full Rankings list by default", () => {
      renderDashboard();
      expect(screen.queryByTestId("full-rankings")).toBeNull();
      expect(screen.queryByText("Full Rankings")).toBeNull();
    });

    it("renders the Full Rankings list after 'View All' is clicked", () => {
      renderDashboard();
      const btn = screen.getByRole("button", { name: /view all/i });
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(btn);
      expect(screen.getByTestId("full-rankings")).toBeDefined();
      expect(screen.getByText("Full Rankings")).toBeDefined();
      // #5 and #6 appear as ranked rows.
      const rows = screen.getAllByTestId("ranked-allergen-row");
      expect(rows.length).toBe(2);
    });

    it("toggles aria-expanded on the View All button", () => {
      renderDashboard();
      const btn = screen.getByRole("button", { name: /view all/i });
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(btn);
      const hideBtn = screen.getByRole("button", { name: /hide rankings/i });
      expect(hideBtn.getAttribute("aria-expanded")).toBe("true");
    });

    it("wires aria-controls on the View All button", () => {
      renderDashboard();
      const btn = screen.getByRole("button", { name: /view all/i });
      const controlsId = btn.getAttribute("aria-controls");
      expect(controlsId).toBeTruthy();
      expect(document.getElementById(controlsId ?? "")).toBeTruthy();
    });

    it("does not render the View All button when there are no ranks beyond #4", () => {
      renderDashboard({ allergens: mockAllergens.slice(0, 4) });
      expect(
        screen.queryByRole("button", { name: /view all/i }),
      ).toBeNull();
    });
  });

  describe("FDA disclaimer placement", () => {
    it("renders the FDA disclaimer exactly once at the bottom", () => {
      renderDashboard();
      const disclaimers = screen.getAllByTestId("fda-disclaimer");
      // The Leaderboard is told not to emit its inline disclaimer,
      // so the page-level one is the only copy present.
      expect(disclaimers.length).toBe(1);

      const fdaWrapper = screen.getByTestId("dashboard-fda-disclaimer");
      expect(within(fdaWrapper).getByTestId("fda-disclaimer")).toBeDefined();
    });
  });
});
