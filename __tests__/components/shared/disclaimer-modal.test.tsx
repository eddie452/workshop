/**
 * FDA Disclaimer Modal Tests
 *
 * Validates the one-time acknowledgment gate that blocks
 * leaderboard access until the user confirms they understand
 * the FDA disclaimer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DisclaimerModal } from "@/components/shared/disclaimer-modal";
import { FDA_DISCLAIMER_LABEL } from "@/components/shared/fda-disclaimer";

/* ------------------------------------------------------------------ */
/* Mock Supabase client                                                */
/* ------------------------------------------------------------------ */

const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();

  // Default: successful update chain
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
});

describe("DisclaimerModal", () => {
  const defaultProps = {
    userId: "user-123",
    onAcknowledge: vi.fn(),
  };

  describe("rendering", () => {
    it("renders as a dialog", () => {
      render(<DisclaimerModal {...defaultProps} />);
      const modal = screen.getByTestId("disclaimer-modal");
      expect(modal.getAttribute("role")).toBe("dialog");
      expect(modal.getAttribute("aria-modal")).toBe("true");
    });

    it("displays the disclaimer label", () => {
      render(<DisclaimerModal {...defaultProps} />);
      expect(screen.getByText(FDA_DISCLAIMER_LABEL)).toBeDefined();
    });

    it("displays the title", () => {
      render(<DisclaimerModal {...defaultProps} />);
      expect(
        screen.getByText("Important Health Disclaimer"),
      ).toBeDefined();
    });

    it('shows "I Understand" button', () => {
      render(<DisclaimerModal {...defaultProps} />);
      const button = screen.getByTestId("acknowledge-button");
      expect(button.textContent).toBe("I Understand");
    });

    it("does not show error by default", () => {
      render(<DisclaimerModal {...defaultProps} />);
      expect(screen.queryByTestId("disclaimer-error")).toBeNull();
    });
  });

  describe("acknowledgment flow", () => {
    it("calls Supabase update with correct params on click", async () => {
      render(<DisclaimerModal {...defaultProps} />);
      const button = screen.getByTestId("acknowledge-button");

      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("user_profiles");
        expect(mockUpdate).toHaveBeenCalledWith({ fda_acknowledged: true });
        expect(mockEq).toHaveBeenCalledWith("id", "user-123");
      });
    });

    it("calls onAcknowledge after successful update", async () => {
      const onAcknowledge = vi.fn();
      render(
        <DisclaimerModal userId="user-123" onAcknowledge={onAcknowledge} />,
      );

      fireEvent.click(screen.getByTestId("acknowledge-button"));

      await waitFor(() => {
        expect(onAcknowledge).toHaveBeenCalledTimes(1);
      });
    });

    it('shows "Saving..." while loading', async () => {
      // Make the update never resolve so we can test loading state
      mockEq.mockReturnValue(new Promise(() => {}));

      render(<DisclaimerModal {...defaultProps} />);
      const button = screen.getByTestId("acknowledge-button");

      fireEvent.click(button);

      await waitFor(() => {
        expect(button.textContent).toBe("Saving...");
        expect(button.hasAttribute("disabled")).toBe(true);
      });
    });

    it("shows error when Supabase update fails", async () => {
      mockEq.mockResolvedValue({
        error: { message: "DB error" },
      });

      render(<DisclaimerModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId("acknowledge-button"));

      await waitFor(() => {
        const errorEl = screen.getByTestId("disclaimer-error");
        expect(errorEl.textContent).toBe(
          "Failed to save acknowledgment. Please try again.",
        );
      });
    });

    it("does NOT call onAcknowledge when update fails", async () => {
      const onAcknowledge = vi.fn();
      mockEq.mockResolvedValue({
        error: { message: "DB error" },
      });

      render(
        <DisclaimerModal userId="user-123" onAcknowledge={onAcknowledge} />,
      );
      fireEvent.click(screen.getByTestId("acknowledge-button"));

      await waitFor(() => {
        expect(screen.getByTestId("disclaimer-error")).toBeDefined();
      });
      expect(onAcknowledge).not.toHaveBeenCalled();
    });

    it("shows error on unexpected exception", async () => {
      mockEq.mockRejectedValue(new Error("Network failure"));

      render(<DisclaimerModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId("acknowledge-button"));

      await waitFor(() => {
        const errorEl = screen.getByTestId("disclaimer-error");
        expect(errorEl.textContent).toBe(
          "An unexpected error occurred. Please try again.",
        );
      });
    });
  });

  describe("accessibility", () => {
    it("has aria-labelledby pointing to the title", () => {
      render(<DisclaimerModal {...defaultProps} />);
      const modal = screen.getByTestId("disclaimer-modal");
      const titleId = modal.getAttribute("aria-labelledby");
      expect(titleId).toBe("fda-modal-title");

      const title = document.getElementById(titleId!);
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe("Important Health Disclaimer");
    });
  });
});
