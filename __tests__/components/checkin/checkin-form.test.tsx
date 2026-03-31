/**
 * Check-in Form Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CheckinForm } from "@/components/checkin/checkin-form";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CheckinForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with severity selector", () => {
    render(<CheckinForm />);
    expect(screen.getByTestId("checkin-form")).toBeDefined();
    expect(screen.getByText("How are your allergies today?")).toBeDefined();
  });

  it("renders the submit button", () => {
    render(<CheckinForm />);
    expect(screen.getByTestId("checkin-submit")).toBeDefined();
  });

  it("shows 'Log Symptom-Free Day' when severity is 0", () => {
    render(<CheckinForm />);
    expect(screen.getByText("Log Symptom-Free Day")).toBeDefined();
  });

  it("shows 'Submit Check-in' when severity > 0", () => {
    render(<CheckinForm />);
    // Select severity 2
    fireEvent.click(screen.getByTestId("severity-2"));
    expect(screen.getByText("Submit Check-in")).toBeDefined();
  });

  it("hides symptom zones when severity is 0", () => {
    render(<CheckinForm />);
    expect(screen.queryByText("Which areas are affected?")).toBeNull();
  });

  it("shows symptom zones when severity > 0", () => {
    render(<CheckinForm />);
    fireEvent.click(screen.getByTestId("severity-1"));
    expect(screen.getByText("Which areas are affected?")).toBeDefined();
  });

  it("shows timing selector when severity > 0", () => {
    render(<CheckinForm />);
    fireEvent.click(screen.getByTestId("severity-2"));
    expect(screen.getByText("When are symptoms worst?")).toBeDefined();
    expect(screen.getByText("Where did you spend most of your time?")).toBeDefined();
  });

  it("shows completion message when alreadyCheckedIn is true", () => {
    render(<CheckinForm alreadyCheckedIn={true} />);
    expect(screen.getByTestId("checkin-complete")).toBeDefined();
    expect(screen.getByText("Already checked in today")).toBeDefined();
  });

  it("submits the form and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        checkin_id: "test-id",
        trigger_champion: "allergen-1",
        final_four: ["allergen-1", "allergen-2"],
      }),
    });

    render(<CheckinForm onSuccess={onSuccess} />);
    fireEvent.click(screen.getByTestId("checkin-submit"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/checkin");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.severity).toBe(0);
  });

  it("shows error on failed submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: "Already checked in today",
      }),
    });

    render(<CheckinForm />);
    fireEvent.click(screen.getByTestId("checkin-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("checkin-error")).toBeDefined();
    });
  });

  it("shows error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<CheckinForm />);
    fireEvent.click(screen.getByTestId("checkin-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("checkin-error")).toBeDefined();
      expect(
        screen.getByText("Network error. Please check your connection and try again."),
      ).toBeDefined();
    });
  });

  it("shows completion state after successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        checkin_id: "test-id",
        trigger_champion: null,
        final_four: [],
      }),
    });

    render(<CheckinForm />);
    fireEvent.click(screen.getByTestId("checkin-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("checkin-complete")).toBeDefined();
      expect(screen.getByText("Check-in submitted!")).toBeDefined();
    });
  });

  it("clears symptoms when severity changes to 0", () => {
    render(<CheckinForm />);
    // Set severity to 2
    fireEvent.click(screen.getByTestId("severity-2"));
    expect(screen.getByText("Which areas are affected?")).toBeDefined();

    // Set severity back to 0
    fireEvent.click(screen.getByTestId("severity-0"));
    expect(screen.queryByText("Which areas are affected?")).toBeNull();
  });

  it("displays symptom-free day hint when severity is 0", () => {
    render(<CheckinForm />);
    expect(
      screen.getByText(/Logging a symptom-free day helps calibrate/),
    ).toBeDefined();
  });
});
