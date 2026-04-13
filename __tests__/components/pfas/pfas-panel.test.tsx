/**
 * PFAS Panel Component Tests
 *
 * Validates the food cross-reactivity panel:
 * - Renders for premium users with cross-reactive data
 * - Blurs food lists for free-tier users
 * - Shows FDA disclaimer
 * - Shows upgrade CTA for free users
 * - Hidden when no cross-reactive data exists
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PfasPanel } from "@/components/pfas/pfas-panel";
import type { PfasCrossReactivity } from "@/lib/pfas/types";

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const mockEntries: PfasCrossReactivity[] = [
  {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    cross_reactive_foods: ["apple", "pear", "cherry", "celery"],
    pfas_severity: "moderate",
  },
  {
    allergen_id: "ragweed",
    common_name: "Ragweed",
    category: "weed",
    cross_reactive_foods: ["banana", "melon", "watermelon"],
    pfas_severity: "moderate",
  },
];

describe("PfasPanel", () => {
  describe("premium user", () => {
    it("renders the PFAS panel section", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      expect(screen.getByTestId("pfas-panel")).toBeDefined();
    });

    it("shows the section heading", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      expect(
        screen.getByText("Food Cross-Reactivity (PFAS)"),
      ).toBeDefined();
    });

    it("renders allergen cards for each entry", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      const cards = screen.getAllByTestId("pfas-allergen-card");
      expect(cards).toHaveLength(2);
    });

    it("shows allergen names on cards", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      expect(screen.getByText("Birch")).toBeDefined();
      expect(screen.getByText("Ragweed")).toBeDefined();
    });

    it("shows cross-reactive food tags for premium users", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      const foodTags = screen.getAllByTestId("pfas-food-tag");
      // birch: 4 foods + ragweed: 3 foods = 7 total
      expect(foodTags).toHaveLength(7);
      expect(screen.getByText("apple")).toBeDefined();
      expect(screen.getByText("banana")).toBeDefined();
    });

    it("shows severity badges", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      const badges = screen.getAllByTestId("pfas-severity-badge");
      expect(badges).toHaveLength(2);
      expect(screen.getAllByText("Moderate")).toHaveLength(2);
    });

    it("shows FDA disclaimer", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      expect(screen.getByTestId("fda-disclaimer")).toBeDefined();
    });

    it("does not show upgrade CTA for premium users", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      expect(screen.queryByTestId("pfas-upgrade-cta")).toBeNull();
    });

    it("does not show blur overlay for premium users", () => {
      render(<PfasPanel entries={mockEntries} isPremium={true} />);
      expect(screen.queryByTestId("blur-overlay")).toBeNull();
    });
  });

  describe("free-tier user", () => {
    it("renders the PFAS panel section", () => {
      render(<PfasPanel entries={mockEntries} isPremium={false} />);
      expect(screen.getByTestId("pfas-panel")).toBeDefined();
    });

    it("shows allergen names (visible even for free tier)", () => {
      render(<PfasPanel entries={mockEntries} isPremium={false} />);
      expect(screen.getByText("Birch")).toBeDefined();
      expect(screen.getByText("Ragweed")).toBeDefined();
    });

    it("blurs food lists for free-tier users", () => {
      render(<PfasPanel entries={mockEntries} isPremium={false} />);
      const blurOverlays = screen.getAllByTestId("blur-overlay");
      expect(blurOverlays.length).toBeGreaterThan(0);
    });

    it("shows upgrade CTA for free users", () => {
      render(<PfasPanel entries={mockEntries} isPremium={false} />);
      expect(screen.getByTestId("pfas-upgrade-cta")).toBeDefined();
    });

    it("shows FDA disclaimer for free users too", () => {
      render(<PfasPanel entries={mockEntries} isPremium={false} />);
      expect(screen.getByTestId("fda-disclaimer")).toBeDefined();
    });
  });

  describe("no data", () => {
    it("returns null when entries array is empty", () => {
      const { container } = render(
        <PfasPanel entries={[]} isPremium={true} />,
      );
      expect(container.innerHTML).toBe("");
    });

    it("does not render PFAS panel when no entries", () => {
      render(<PfasPanel entries={[]} isPremium={false} />);
      expect(screen.queryByTestId("pfas-panel")).toBeNull();
    });
  });

  describe("severity badges", () => {
    it("renders mild_oas severity correctly", () => {
      const mildEntry: PfasCrossReactivity[] = [
        {
          allergen_id: "oak",
          common_name: "Oak",
          category: "tree",
          cross_reactive_foods: ["apple", "cherry"],
          pfas_severity: "mild_oas",
        },
      ];
      render(<PfasPanel entries={mildEntry} isPremium={true} />);
      expect(screen.getByText("Mild OAS")).toBeDefined();
    });

    it("renders systemic_risk severity correctly", () => {
      const systemicEntry: PfasCrossReactivity[] = [
        {
          allergen_id: "peanut_tree",
          common_name: "Peanut (tree nut cross)",
          category: "tree",
          cross_reactive_foods: ["peanut", "soy", "lentil"],
          pfas_severity: "systemic_risk",
        },
      ];
      render(<PfasPanel entries={systemicEntry} isPremium={true} />);
      expect(screen.getByText("Systemic Risk")).toBeDefined();
      const badge = screen.getByTestId("pfas-severity-badge");
      expect(badge).toBeDefined();
    });
  });
});
