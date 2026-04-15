/**
 * BracketNode — component tests (ticket #179)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BracketNode } from "@/components/bracket/bracket-node";
import type { BracketNodeVM } from "@/components/bracket/types";

function makeNode(overrides: Partial<BracketNodeVM> = {}): BracketNodeVM {
  return {
    round: 0,
    matchId: 0,
    left: {
      allergenId: "ragweed",
      name: "Ragweed",
      thumbnail: { src: "/allergens/generic-plant.svg", alt: "Ragweed icon" },
      discriminative: 0.8,
      posterior: 0.8,
    },
    right: {
      allergenId: "oak-pollen",
      name: "Oak Pollen",
      thumbnail: {
        src: "/allergens/generic-plant.svg",
        alt: "Oak pollen icon",
      },
      discriminative: 0.4,
      posterior: 0.4,
    },
    winnerSide: "left",
    leftScore: 1000,
    rightScore: 600,
    ...overrides,
  };
}

describe("BracketNode", () => {
  it("renders both side names", () => {
    render(<BracketNode node={makeNode()} />);
    expect(screen.getByTestId("bracket-side-left-name").textContent).toBe(
      "Ragweed",
    );
    expect(screen.getByTestId("bracket-side-right-name").textContent).toBe(
      "Oak Pollen",
    );
  });

  it("renders thumbnails for both sides", () => {
    render(<BracketNode node={makeNode()} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    expect(imgs[0].getAttribute("src")).toBe("/allergens/generic-plant.svg");
  });

  it("marks the loser side with reduced opacity and strikethrough", () => {
    render(<BracketNode node={makeNode()} />);
    const loser = screen.getByTestId("bracket-side-right");
    expect(loser.getAttribute("data-winner")).toBe("false");
    expect(loser.className).toContain("opacity-60");
    const loserName = screen.getByTestId("bracket-side-right-name");
    expect(loserName.className).toContain("line-through");
  });

  it("marks the winner side without the strikethrough", () => {
    render(<BracketNode node={makeNode()} />);
    const winner = screen.getByTestId("bracket-side-left");
    expect(winner.getAttribute("data-winner")).toBe("true");
    const winnerName = screen.getByTestId("bracket-side-left-name");
    expect(winnerName.className).not.toContain("line-through");
  });

  it("shows the Nature Pop champion badge on the final match winner with posterior >= 0.75", () => {
    render(<BracketNode node={makeNode()} isFinal />);
    const badge = screen.getByTestId("bracket-champion-badge");
    expect(badge.textContent).toContain("Most likely trigger");
    expect(badge.className).toContain("bg-brand-accent");
  });

  it("does NOT show the champion badge when posterior < 0.75 even if final", () => {
    const node = makeNode({
      left: {
        ...makeNode().left,
        posterior: 0.6,
        discriminative: 0.6,
      },
    });
    render(<BracketNode node={node} isFinal />);
    expect(screen.queryByTestId("bracket-champion-badge")).toBeNull();
    // But the advancing side still gets the muted "Advances" badge.
    expect(screen.getByTestId("bracket-winner-badge")).toBeDefined();
  });

  it("uses the muted 'Advances' badge for non-final winners", () => {
    render(<BracketNode node={makeNode()} isFinal={false} />);
    expect(screen.queryByTestId("bracket-champion-badge")).toBeNull();
    const badge = screen.getByTestId("bracket-winner-badge");
    expect(badge).toBeDefined();
    expect(badge.className).toContain("border-brand-primary");
  });

  it("has an accessible name combining both sides", () => {
    render(<BracketNode node={makeNode()} />);
    const card = screen.getByTestId("bracket-node");
    expect(card.getAttribute("aria-label")).toBe(
      "Match: Ragweed vs Oak Pollen, winner Ragweed",
    );
  });

  it("renders confidence bars (not a raw percentage label) for each side", () => {
    render(<BracketNode node={makeNode()} />);
    const leftBar = screen.getByTestId("bracket-side-left-bar");
    const rightBar = screen.getByTestId("bracket-side-right-bar");
    expect(leftBar.getAttribute("data-tier")).toBe("high"); // posterior 0.8
    expect(rightBar.getAttribute("data-tier")).toBe("low"); // posterior 0.4
    // No visible "80%" / "40%" label on the card.
    expect(screen.queryByText("80%")).toBeNull();
    expect(screen.queryByText("40%")).toBeNull();
  });
});
