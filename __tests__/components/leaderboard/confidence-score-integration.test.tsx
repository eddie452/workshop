/**
 * Integration: engine confidence score -> ConfidenceBadge render (#160)
 *
 * Exercises the full path from the engine's numeric score
 * (`getConfidenceScoreBySignals`) through `RankedAllergen` into the
 * shared `ConfidenceBadge`, confirming the badge renders a non-null
 * numeric value and that the bucket matches the engine output. This
 * guards against the NO-GO regression from #159 where the badges were
 * silently rendering empty because the score was hard-coded to null.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TriggerChampionCard } from "@/components/leaderboard/trigger-champion-card";
import { getConfidenceScoreBySignals } from "@/lib/engine/confidence-score";
import { getConfidenceInfo } from "@/lib/engine/confidence-buckets";
import type { RankedAllergen } from "@/components/leaderboard/types";

function buildRanked(
  totalSignals: number,
  overrides: Partial<RankedAllergen> = {},
): RankedAllergen {
  return {
    allergen_id: "oak",
    common_name: "Oak",
    category: "tree",
    elo_score: 1500,
    confidence_tier: "high",
    score: getConfidenceScoreBySignals(totalSignals),
    rank: 1,
    ...overrides,
  };
}

describe("engine score -> ConfidenceBadge render", () => {
  it("renders a non-null badge when the engine emits a numeric score (high bucket, 20 signals)", () => {
    const allergen = buildRanked(20);
    render(<TriggerChampionCard allergen={allergen} />);

    const badge = screen.getByTestId("shared-confidence-badge");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-bucket")).toBe("high");

    // Sanity — the engine score and the UI bucket agree.
    const info = getConfidenceInfo(allergen.score);
    expect(info.bucket).toBe("high");
  });

  it("renders a medium-bucket badge at 7 signals (the low->medium boundary)", () => {
    const allergen = buildRanked(7);
    render(<TriggerChampionCard allergen={allergen} />);

    const badge = screen.getByTestId("shared-confidence-badge");
    expect(badge.getAttribute("data-bucket")).toBe("medium");
    expect(badge.textContent).toContain("50%");
  });

  it("renders a high-bucket badge at 14 signals (the medium->high boundary)", () => {
    const allergen = buildRanked(14);
    render(<TriggerChampionCard allergen={allergen} />);

    const badge = screen.getByTestId("shared-confidence-badge");
    expect(badge.getAttribute("data-bucket")).toBe("high");
    expect(badge.textContent).toContain("75%");
  });

  it("renders a low-bucket badge at 6 signals (below the medium threshold)", () => {
    const allergen = buildRanked(6);
    render(<TriggerChampionCard allergen={allergen} />);

    const badge = screen.getByTestId("shared-confidence-badge");
    expect(badge.getAttribute("data-bucket")).toBe("low");
  });
});
