/**
 * FDA Disclaimer Banner Tests
 *
 * Validates that the persistent disclaimer renders correctly
 * in both banner and compact variants, with the exact regulatory text.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FdaDisclaimer,
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "@/components/shared/fda-disclaimer";

describe("FdaDisclaimer", () => {
  describe("banner variant (default)", () => {
    it("renders the disclaimer label", () => {
      render(<FdaDisclaimer />);
      expect(screen.getByText(FDA_DISCLAIMER_LABEL)).toBeDefined();
    });

    it("renders the full disclaimer text", () => {
      render(<FdaDisclaimer />);
      expect(screen.getByText(FDA_DISCLAIMER_FULL_TEXT)).toBeDefined();
    });

    it("has role=status for accessibility", () => {
      render(<FdaDisclaimer />);
      const el = screen.getByTestId("fda-disclaimer");
      expect(el.getAttribute("role")).toBe("status");
    });

    it("has aria-label for screen readers", () => {
      render(<FdaDisclaimer />);
      const el = screen.getByTestId("fda-disclaimer");
      expect(el.getAttribute("aria-label")).toBe("FDA disclaimer");
    });

    it("renders as a div container in banner mode", () => {
      render(<FdaDisclaimer />);
      const el = screen.getByTestId("fda-disclaimer");
      expect(el.tagName).toBe("DIV");
    });

    it("applies custom className", () => {
      render(<FdaDisclaimer className="my-custom-class" />);
      const el = screen.getByTestId("fda-disclaimer");
      expect(el.className).toContain("my-custom-class");
    });
  });

  describe("compact variant", () => {
    it("renders the disclaimer label only", () => {
      render(<FdaDisclaimer variant="compact" />);
      expect(screen.getByText(FDA_DISCLAIMER_LABEL)).toBeDefined();
    });

    it("does NOT render the full text in compact mode", () => {
      render(<FdaDisclaimer variant="compact" />);
      expect(screen.queryByText(FDA_DISCLAIMER_FULL_TEXT)).toBeNull();
    });

    it("renders as a p element in compact mode", () => {
      render(<FdaDisclaimer variant="compact" />);
      const el = screen.getByTestId("fda-disclaimer");
      expect(el.tagName).toBe("P");
    });

    it("has role=status in compact mode", () => {
      render(<FdaDisclaimer variant="compact" />);
      const el = screen.getByTestId("fda-disclaimer");
      expect(el.getAttribute("role")).toBe("status");
    });
  });

  describe("exported constants", () => {
    it("FDA_DISCLAIMER_LABEL matches exact regulatory text", () => {
      expect(FDA_DISCLAIMER_LABEL).toBe(
        "Predicted Triggers \u2014 Not a Diagnosis",
      );
    });

    it("FDA_DISCLAIMER_FULL_TEXT includes key regulatory phrases", () => {
      expect(FDA_DISCLAIMER_FULL_TEXT).toContain("wellness screening");
      expect(FDA_DISCLAIMER_FULL_TEXT).toContain(
        "NOT an FDA-approved diagnostic test",
      );
      expect(FDA_DISCLAIMER_FULL_TEXT).toContain(
        "does not diagnose, treat, cure, or prevent",
      );
      expect(FDA_DISCLAIMER_FULL_TEXT).toContain(
        "consult a licensed medical provider",
      );
    });
  });
});
