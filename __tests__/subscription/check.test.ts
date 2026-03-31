/**
 * Subscription Check Tests
 *
 * Tests the subscription status checker and feature gating logic.
 *
 * Key scenarios:
 * - PAYWALL_ENABLED=false: all features accessible (workshop mode)
 * - PAYWALL_ENABLED=true + free tier: no premium features
 * - PAYWALL_ENABLED=true + madness_plus: all premium features
 * - PAYWALL_ENABLED=true + referral_unlocked: all premium features
 * - Expired subscription: treated as free
 * - hasFeatureAccess synchronous check
 *
 * IMPORTANT: income_tier must NEVER appear in any test output.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/* Mock Supabase client factory                                        */
/* ------------------------------------------------------------------ */

interface MockSubData {
  tier?: string;
  expires_at?: string | null;
}

interface MockProfileData {
  features_unlocked?: boolean;
}

function createMockSupabase(
  sub: MockSubData | null = null,
  profile: MockProfileData | null = null,
) {
  const mockFrom = vi.fn((table: string) => {
    const chain = {
      select: () => ({
        eq: (_col: string, _val: string) => ({
          eq: () => ({
            single: async () => ({
              data: table === "user_profiles" ? profile : null,
              error: null,
            }),
            maybeSingle: async () => ({
              data: table === "user_subscriptions" ? sub : null,
              error: null,
            }),
          }),
          single: async () => ({
            data: table === "user_profiles" ? profile : null,
            error: null,
          }),
          maybeSingle: async () => ({
            data: table === "user_subscriptions" ? sub : null,
            error: null,
          }),
        }),
      }),
    };
    return chain;
  });

  return { from: mockFrom } as never;
}

/* ------------------------------------------------------------------ */
/* Tests with PAYWALL_ENABLED = false (workshop mode)                  */
/* ------------------------------------------------------------------ */

describe("subscription check — paywall disabled (workshop mode)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "false");
  });

  it("getAccessStatus returns isPremium=true when paywall disabled", async () => {
    const { getAccessStatus } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase();

    const status = await getAccessStatus(supabase, "user-1");

    expect(status.isPremium).toBe(true);
    expect(status.tier).toBe("free");
    expect(status.subscriptionActive).toBe(false);
    expect(status.referralUnlocked).toBe(false);
  });

  it("isFeatureAvailable returns true for all features when paywall disabled", async () => {
    const { isFeatureAvailable } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase();

    expect(await isFeatureAvailable(supabase, "user-1", "final_four")).toBe(
      true,
    );
    expect(await isFeatureAvailable(supabase, "user-1", "pdf_report")).toBe(
      true,
    );
    expect(
      await isFeatureAvailable(supabase, "user-1", "detailed_confidence"),
    ).toBe(true);
  });

  it("hasFeatureAccess returns true for any status when paywall disabled", async () => {
    const { hasFeatureAccess } = await import("@/lib/subscription/check");

    const freeStatus = {
      tier: "free" as const,
      subscriptionActive: false,
      referralUnlocked: false,
      isPremium: false,
    };

    expect(hasFeatureAccess(freeStatus, "final_four")).toBe(true);
    expect(hasFeatureAccess(freeStatus, "pdf_report")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Tests with PAYWALL_ENABLED = true                                   */
/* ------------------------------------------------------------------ */

describe("subscription check — paywall enabled", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "true");
  });

  it("free tier user has no premium access", async () => {
    const { getAccessStatus } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(null, { features_unlocked: false });

    const status = await getAccessStatus(supabase, "user-1");

    expect(status.isPremium).toBe(false);
    expect(status.tier).toBe("free");
    expect(status.subscriptionActive).toBe(false);
    expect(status.referralUnlocked).toBe(false);
  });

  it("madness_plus subscriber has premium access", async () => {
    const { getAccessStatus } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(
      { tier: "madness_plus", expires_at: null },
      { features_unlocked: false },
    );

    const status = await getAccessStatus(supabase, "user-1");

    expect(status.isPremium).toBe(true);
    expect(status.tier).toBe("madness_plus");
    expect(status.subscriptionActive).toBe(true);
  });

  it("expired subscription treated as free", async () => {
    const { getAccessStatus } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(
      { tier: "madness_plus", expires_at: "2020-01-01T00:00:00Z" },
      { features_unlocked: false },
    );

    const status = await getAccessStatus(supabase, "user-1");

    expect(status.isPremium).toBe(false);
    expect(status.subscriptionActive).toBe(false);
  });

  it("referral_unlocked grants premium access regardless of tier", async () => {
    const { getAccessStatus } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(null, { features_unlocked: true });

    const status = await getAccessStatus(supabase, "user-1");

    expect(status.isPremium).toBe(true);
    expect(status.referralUnlocked).toBe(true);
    expect(status.tier).toBe("free");
  });

  it("isFeatureAvailable returns false for free tier", async () => {
    const { isFeatureAvailable } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(null, { features_unlocked: false });

    expect(await isFeatureAvailable(supabase, "user-1", "final_four")).toBe(
      false,
    );
    expect(await isFeatureAvailable(supabase, "user-1", "pdf_report")).toBe(
      false,
    );
  });

  it("isFeatureAvailable returns true for referral-unlocked users", async () => {
    const { isFeatureAvailable } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(null, { features_unlocked: true });

    expect(await isFeatureAvailable(supabase, "user-1", "final_four")).toBe(
      true,
    );
    expect(await isFeatureAvailable(supabase, "user-1", "pdf_report")).toBe(
      true,
    );
  });

  it("isFeatureAvailable returns true for active madness_plus subscriber", async () => {
    const { isFeatureAvailable } = await import("@/lib/subscription/check");
    const supabase = createMockSupabase(
      { tier: "madness_plus", expires_at: null },
      { features_unlocked: false },
    );

    expect(await isFeatureAvailable(supabase, "user-1", "final_four")).toBe(
      true,
    );
    expect(
      await isFeatureAvailable(supabase, "user-1", "detailed_confidence"),
    ).toBe(true);
  });

  it("hasFeatureAccess respects isPremium flag", async () => {
    const { hasFeatureAccess } = await import("@/lib/subscription/check");

    const premiumStatus = {
      tier: "madness_plus" as const,
      subscriptionActive: true,
      referralUnlocked: false,
      isPremium: true,
    };

    expect(hasFeatureAccess(premiumStatus, "final_four")).toBe(true);

    const freeStatus = {
      tier: "free" as const,
      subscriptionActive: false,
      referralUnlocked: false,
      isPremium: false,
    };

    expect(hasFeatureAccess(freeStatus, "final_four")).toBe(false);
  });
});
