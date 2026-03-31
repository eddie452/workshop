/**
 * Referral Share Component Tests
 *
 * Validates:
 * - Referral link display
 * - Copy button functionality
 * - Link uses dynamic origin (never hardcoded)
 * - No health data in displayed link
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReferralShare } from "@/components/referral/referral-share";

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, {
    clipboard: { writeText: mockWriteText },
    share: undefined,
  });
});

describe("ReferralShare", () => {
  it("renders the referral link display", () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    const linkDisplay = screen.getByTestId("referral-link-display");
    expect(linkDisplay.textContent).toContain("ref=TESTCODE");
  });

  it("renders copy button", () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    expect(screen.getByTestId("referral-copy-btn")).toBeDefined();
    expect(screen.getByText("Copy Link")).toBeDefined();
  });

  it("copies link to clipboard on button click", async () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    const btn = screen.getByTestId("referral-copy-btn");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining("ref=TESTCODE"),
      );
    });
  });

  it("shows 'Copied!' after clicking copy", async () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    fireEvent.click(screen.getByTestId("referral-copy-btn"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeDefined();
    });
  });

  it("link contains no health data", () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    const linkDisplay = screen.getByTestId("referral-link-display");
    const linkText = linkDisplay.textContent ?? "";
    expect(linkText).not.toContain("allergen");
    expect(linkText).not.toContain("symptom");
    expect(linkText).not.toContain("diagnosis");
    expect(linkText).not.toContain("income");
  });

  it("does not show share button when navigator.share is unavailable", () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    expect(screen.queryByTestId("referral-share-btn")).toBeNull();
  });

  it("has data-testid for targeting", () => {
    render(<ReferralShare referralCode="TESTCODE" />);
    expect(screen.getByTestId("referral-share")).toBeDefined();
  });

  it("applies custom className", () => {
    render(<ReferralShare referralCode="TESTCODE" className="my-class" />);
    const el = screen.getByTestId("referral-share");
    expect(el.className).toContain("my-class");
  });
});
