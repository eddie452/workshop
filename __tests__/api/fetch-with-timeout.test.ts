/**
 * fetchWithTimeout Utility Tests
 *
 * Validates that the shared fetch wrapper correctly applies
 * AbortSignal.timeout and passes through options to fetch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithTimeout, API_TIMEOUT_MS } from "@/lib/apis/fetch-with-timeout";

/* ------------------------------------------------------------------ */
/* Mock fetch                                                          */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ------------------------------------------------------------------ */
/* Mock AbortSignal.timeout                                            */
/* ------------------------------------------------------------------ */

const mockSignal = { aborted: false } as AbortSignal;
const mockTimeout = vi.fn().mockReturnValue(mockSignal);
vi.stubGlobal("AbortSignal", { timeout: mockTimeout });

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimeout.mockReturnValue(mockSignal);
  });

  it("exports API_TIMEOUT_MS as 5000", () => {
    expect(API_TIMEOUT_MS).toBe(5_000);
  });

  it("calls fetch with AbortSignal.timeout using default timeout", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await fetchWithTimeout("https://example.com/api");

    expect(mockTimeout).toHaveBeenCalledWith(5_000);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api", {
      signal: mockSignal,
    });
  });

  it("accepts a custom timeout value", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    await fetchWithTimeout("https://example.com/api", {}, 3_000);

    expect(mockTimeout).toHaveBeenCalledWith(3_000);
  });

  it("passes through request options (headers, method, etc.)", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    const options = {
      method: "POST",
      headers: { Authorization: "Bearer test-key" },
    };

    await fetchWithTimeout("https://example.com/api", options);

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api", {
      ...options,
      signal: mockSignal,
    });
  });

  it("returns the fetch Response on success", async () => {
    const mockResponse = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout("https://example.com/api");
    expect(result).toBe(mockResponse);
  });

  it("propagates fetch rejection (e.g. timeout AbortError)", async () => {
    const abortError = new DOMException("signal timed out", "TimeoutError");
    mockFetch.mockRejectedValue(abortError);

    await expect(
      fetchWithTimeout("https://example.com/api"),
    ).rejects.toThrow("signal timed out");
  });

  it("propagates network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    await expect(
      fetchWithTimeout("https://example.com/api"),
    ).rejects.toThrow("Network failure");
  });
});
