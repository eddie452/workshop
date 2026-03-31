/**
 * Subscription Constants Tests
 *
 * Validates the subscription tier configuration and feature mapping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("subscription constants", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("PAYWALL_ENABLED defaults to false when env not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "");
    const { PAYWALL_ENABLED } = await import("@/lib/subscription/constants");
    expect(PAYWALL_ENABLED).toBe(false);
  });

  it("PAYWALL_ENABLED is true when env is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "true");
    const { PAYWALL_ENABLED } = await import("@/lib/subscription/constants");
    expect(PAYWALL_ENABLED).toBe(true);
  });

  it("PAYWALL_ENABLED is false for non-'true' values", async () => {
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "1");
    const { PAYWALL_ENABLED } = await import("@/lib/subscription/constants");
    expect(PAYWALL_ENABLED).toBe(false);
  });

  it("free tier has no features", async () => {
    const { TIER_FEATURES } = await import("@/lib/subscription/constants");
    expect(TIER_FEATURES.free).toEqual([]);
  });

  it("madness_plus tier has all premium features", async () => {
    const { TIER_FEATURES } = await import("@/lib/subscription/constants");
    expect(TIER_FEATURES.madness_plus).toContain("final_four");
    expect(TIER_FEATURES.madness_plus).toContain("pdf_report");
    expect(TIER_FEATURES.madness_plus).toContain("detailed_confidence");
  });

  it("madness_family tier has all premium features", async () => {
    const { TIER_FEATURES } = await import("@/lib/subscription/constants");
    expect(TIER_FEATURES.madness_family).toContain("final_four");
    expect(TIER_FEATURES.madness_family).toContain("pdf_report");
    expect(TIER_FEATURES.madness_family).toContain("detailed_confidence");
  });

  it("PREMIUM_TIERS contains madness_plus and madness_family", async () => {
    const { PREMIUM_TIERS } = await import("@/lib/subscription/constants");
    expect(PREMIUM_TIERS).toContain("madness_plus");
    expect(PREMIUM_TIERS).toContain("madness_family");
    expect(PREMIUM_TIERS).not.toContain("free");
  });
});
