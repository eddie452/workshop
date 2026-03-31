/**
 * Vision API Client Tests
 *
 * Tests for the Google Cloud Vision AI client:
 * - Returns defaults when API key is not configured
 * - Returns defaults when empty image data is provided
 * - Validates exported constants
 */

import { describe, it, expect } from "vitest";
import { detectLabels, VISION_DEFAULTS, MAX_LABELS } from "@/lib/apis/vision";

describe("detectLabels", () => {
  it("returns error when GOOGLE_CLOUD_VISION_API_KEY is not set", async () => {
    // API key is not set in test environment
    const result = await detectLabels("dGVzdA==");

    expect(result.success).toBe(false);
    expect(result.labels).toEqual([]);
    expect(result.error).toContain("GOOGLE_CLOUD_VISION_API_KEY");
  });

  it("returns error when empty image data is provided", async () => {
    const result = await detectLabels("");

    expect(result.success).toBe(false);
    expect(result.labels).toEqual([]);
    expect(result.error).toContain("No image data provided");
  });
});

describe("VISION_DEFAULTS", () => {
  it("has success=false and empty labels", () => {
    expect(VISION_DEFAULTS.success).toBe(false);
    expect(VISION_DEFAULTS.labels).toEqual([]);
    expect(VISION_DEFAULTS.error).toBeDefined();
  });
});

describe("MAX_LABELS", () => {
  it("is 20", () => {
    expect(MAX_LABELS).toBe(20);
  });
});
