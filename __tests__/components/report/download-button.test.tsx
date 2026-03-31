/**
 * Download Report Button Tests
 *
 * Tests the DownloadReportButton client component.
 * Key assertions:
 * - Renders download button
 * - Shows loading state during fetch
 * - Shows error message on failure
 * - Triggers download on success
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DownloadReportButton } from "@/components/report/download-button";

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DownloadReportButton", () => {
  it("renders the download button", () => {
    render(<DownloadReportButton />);

    const button = screen.getByTestId("download-report-button");
    expect(button).toBeDefined();
    expect(button.textContent).toContain("Share Report (PDF)");
  });

  it("shows loading state during fetch", async () => {
    // Mock fetch that never resolves (to check loading state)
    const fetchMock = vi.fn(
      () => new Promise<Response>(() => {})
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadReportButton />);

    const button = screen.getByTestId("download-report-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(button.textContent).toContain("Generating...");
    });
  });

  it("shows error on API failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadReportButton />);

    const button = screen.getByTestId("download-report-button");
    fireEvent.click(button);

    await waitFor(() => {
      const error = screen.getByTestId("download-report-error");
      expect(error.textContent).toContain("Unauthorized");
    });
  });

  it("shows network error on fetch exception", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadReportButton />);

    const button = screen.getByTestId("download-report-button");
    fireEvent.click(button);

    await waitFor(() => {
      const error = screen.getByTestId("download-report-error");
      expect(error.textContent).toContain("Network error");
    });
  });

  it("triggers download on successful response", async () => {
    const mockBlob = new Blob(["%PDF-test"], { type: "application/pdf" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Track DOM manipulation for download link
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    render(<DownloadReportButton />);

    const button = screen.getByTestId("download-report-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it("calls correct API endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob()),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadReportButton />);

    const button = screen.getByTestId("download-report-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/report/pdf");
    });
  });

  it("accepts className prop", () => {
    render(<DownloadReportButton className="my-custom-class" />);

    const button = screen.getByTestId("download-report-button");
    // Button should exist (className is on parent div, but button renders)
    expect(button).toBeDefined();
  });
});
