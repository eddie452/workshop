/**
 * Shared ConfidenceBadge Tests
 *
 * Verifies all three variants render the expected percent, label,
 * and bucket metadata, and that the bar variant sets width from %.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";

describe("ConfidenceBadge", () => {
  describe("compact variant (default)", () => {
    it("renders the rounded percent", () => {
      render(<ConfidenceBadge score={0.87} />);
      expect(screen.getByText("87%")).toBeDefined();
    });

    it("renders the high confidence label", () => {
      render(<ConfidenceBadge score={0.9} />);
      expect(screen.getByText("High Confidence")).toBeDefined();
    });

    it("renders the medium confidence label for 0.6", () => {
      render(<ConfidenceBadge score={0.6} />);
      expect(screen.getByText("Medium Confidence")).toBeDefined();
    });

    it("renders the low confidence label for 0.2", () => {
      render(<ConfidenceBadge score={0.2} />);
      expect(screen.getByText("Low Confidence")).toBeDefined();
    });

    it("omits the tagline", () => {
      render(<ConfidenceBadge score={0.87} />);
      expect(
        screen.queryByText("We're highly confident this is a trigger."),
      ).toBeNull();
    });

    it("tags the bucket via data attribute", () => {
      render(<ConfidenceBadge score={0.87} />);
      const el = screen.getByTestId("shared-confidence-badge");
      expect(el.getAttribute("data-bucket")).toBe("high");
      expect(el.getAttribute("data-variant")).toBe("compact");
    });

    it("includes percent and bucket in aria-label", () => {
      render(<ConfidenceBadge score={0.87} />);
      const el = screen.getByTestId("shared-confidence-badge");
      expect(el.getAttribute("aria-label")).toBe(
        "87 percent confidence, high",
      );
    });
  });

  describe("full variant", () => {
    it("includes the tagline", () => {
      render(<ConfidenceBadge score={0.87} variant="full" />);
      expect(
        screen.getByText("We're highly confident this is a trigger."),
      ).toBeDefined();
    });

    it("renders percent and label", () => {
      render(<ConfidenceBadge score={0.6} variant="full" />);
      expect(screen.getByText("60%")).toBeDefined();
      expect(screen.getByText("Medium Confidence")).toBeDefined();
    });
  });

  describe("bar variant", () => {
    it("renders a bar element with width set to the percent", () => {
      render(<ConfidenceBadge score={0.42} variant="bar" />);
      const fill = screen.getByTestId("confidence-bar-fill");
      expect((fill as HTMLElement).style.width).toBe("42%");
    });

    it("renders the percent text", () => {
      render(<ConfidenceBadge score={0.42} variant="bar" />);
      expect(screen.getByText("42%")).toBeDefined();
    });

    it("tags the variant via data attribute", () => {
      render(<ConfidenceBadge score={0.42} variant="bar" />);
      const el = screen.getByTestId("shared-confidence-badge");
      expect(el.getAttribute("data-variant")).toBe("bar");
    });

    it("includes percent and bucket in aria-label", () => {
      render(<ConfidenceBadge score={0.42} variant="bar" />);
      const el = screen.getByTestId("shared-confidence-badge");
      expect(el.getAttribute("aria-label")).toBe(
        "42 percent confidence, low",
      );
    });
  });
});
