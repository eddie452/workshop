/**
 * Dashboard Page Integration Test
 *
 * Pins the wiring between `getCachedAccessStatus` in
 * `app/(app)/dashboard/page.tsx` and the props passed to the
 * leaderboard surface. This is the gap between:
 *
 *   check.test.ts       — pins the helper (getCachedAccessStatus)
 *   leaderboard.test.tsx — pins the component (Leaderboard)
 *   >>> this file <<<   — pins the page-level wiring between them
 *
 * The test must FAIL if someone reverts the dashboard to the old
 * inline AccessStatus pattern that queried `from("subscriptions")`
 * directly and ignored `expires_at`.
 *
 * Approach: Hybrid (Option C from ticket #190)
 *   1. Source-scan assertions verify the page imports
 *      `getCachedAccessStatus` and does NOT contain the old inline
 *      `from("subscriptions")` pattern.
 *   2. Contract assertions verify the wiring logic: calling
 *      `getCachedAccessStatus` then `hasFeatureAccess` produces the
 *      correct `hasFullRankings` value for expired vs active subs.
 *
 * Related: #169 (original bug), #189 (migration PR), #190 (this ticket)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { AccessStatus, PremiumFeature } from "@/lib/subscription/types";

/* ------------------------------------------------------------------ */
/* Source-scan setup                                                    */
/* ------------------------------------------------------------------ */

const DASHBOARD_PAGE_PATH = resolve(
  __dirname,
  "../../app/(app)/dashboard/page.tsx",
);

const dashboardSource = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");

/* ------------------------------------------------------------------ */
/* Mock React cache() — same pattern as check.test.ts                  */
/* ------------------------------------------------------------------ */

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      let result: ReturnType<T> | undefined;
      return ((...args: unknown[]) => {
        if (result === undefined) {
          result = fn(...args) as ReturnType<T>;
        }
        return result;
      }) as unknown as T;
    },
  };
});

/* ------------------------------------------------------------------ */
/* Mock Supabase factory (mirrors check.test.ts pattern)               */
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
            data:
              table === "user_profiles"
                ? (profile ?? { features_unlocked: false })
                : null,
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
/* Helpers imported dynamically per-test (paywall must be enabled)      */
/* ------------------------------------------------------------------ */

let getAccessStatus: (supabase: never, userId: string) => Promise<AccessStatus>;
let hasFeatureAccess: (status: AccessStatus, feature: PremiumFeature) => boolean;

/* ------------------------------------------------------------------ */
/* 1. Source-scan assertions — catches a revert to inline pattern      */
/* ------------------------------------------------------------------ */

describe("dashboard page source scan (revert detection)", () => {
  it("imports getCachedAccessStatus from @/lib/subscription", () => {
    // The page must use the canonical helper, not an inline query.
    expect(dashboardSource).toContain("getCachedAccessStatus");
    expect(dashboardSource).toMatch(
      /import\s+\{[^}]*getCachedAccessStatus[^}]*\}\s+from\s+["']@\/lib\/subscription/,
    );
  });

  it("imports hasFeatureAccess from @/lib/subscription", () => {
    expect(dashboardSource).toContain("hasFeatureAccess");
    expect(dashboardSource).toMatch(
      /import\s+\{[^}]*hasFeatureAccess[^}]*\}\s+from\s+["']@\/lib\/subscription/,
    );
  });

  it("does NOT contain inline from('subscriptions') query (old pattern)", () => {
    // The pre-#189 pattern queried subscriptions directly:
    //   supabase.from("subscriptions").select("*")...
    // This must not appear in the dashboard page.
    expect(dashboardSource).not.toMatch(/from\(\s*["']subscriptions["']\s*\)/);
  });

  it("does NOT derive hasFullRankings from raw subscription status", () => {
    // The old pattern was:
    //   const hasFullRankings = subscription?.status === "active"
    // The new pattern uses hasFeatureAccess(accessStatus, "full_rankings").
    expect(dashboardSource).not.toMatch(
      /hasFullRankings\s*=\s*subscription/,
    );
    expect(dashboardSource).toMatch(
      /hasFullRankings\s*=\s*hasFeatureAccess\(/,
    );
  });

  it("passes hasFullRankings to DashboardLeaderboard", () => {
    // Verify the prop is wired through to the leaderboard surface.
    expect(dashboardSource).toMatch(/hasFullRankings=\{hasFullRankings\}/);
  });

  it("redirects to /onboarding when user has no home_region (#282 defense-in-depth)", () => {
    // The dashboard must guard against authenticated-but-not-onboarded
    // users. This source-scan catches a revert that would reintroduce
    // the P0 bug (empty dashboard + symptom_checkins FK violation).
    expect(dashboardSource).toMatch(/home_region/);
    expect(dashboardSource).toMatch(
      /if\s*\(\s*!profile\?\.home_region\s*\)\s*\{?\s*redirect\(\s*["']\/onboarding["']\s*\)/,
    );
  });
});

/* ------------------------------------------------------------------ */
/* 2. Contract assertions — wiring logic produces correct gate values   */
/*                                                                      */
/* These exercise the EXACT same call sequence the dashboard performs:  */
/*   1. getCachedAccessStatus(supabase, userId) → accessStatus         */
/*   2. hasFeatureAccess(accessStatus, "full_rankings") → boolean      */
/*                                                                      */
/* If the dashboard reverted to inline logic that ignores expires_at,  */
/* these tests would still pass in isolation — but the source-scan     */
/* tests above would fail, catching the revert. Together, the two      */
/* layers ensure both correctness AND wiring.                          */
/* ------------------------------------------------------------------ */

describe("dashboard wiring contract: expired subscription → locked", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Paywall must be enabled for gate logic to activate.
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "true");
    const mod = await import("@/lib/subscription/check");
    getAccessStatus = mod.getAccessStatus;
    hasFeatureAccess = mod.hasFeatureAccess;
  });

  it("treats an expired madness_plus subscription as free (hasFullRankings=false)", async () => {
    // Subscription tier is premium but expires_at is in the past.
    // The old inline pattern ignored expires_at, so this would have
    // returned hasFullRankings=true — a paywall bypass.
    const pastDate = new Date(Date.now() - 86_400_000).toISOString();
    const supabase = createMockSupabase(
      { tier: "madness_plus", expires_at: pastDate },
      { features_unlocked: false },
    );

    const accessStatus = await getAccessStatus(supabase, "user-expired");

    // Step 1: accessStatus should reflect inactive subscription.
    expect(accessStatus.subscriptionActive).toBe(false);
    expect(accessStatus.isPremium).toBe(false);

    // Step 2: the dashboard's hasFullRankings derivation.
    const hasFullRankings = hasFeatureAccess(accessStatus, "full_rankings");
    expect(hasFullRankings).toBe(false);
  });

  it("treats a null-tier (no subscription row) as free (hasFullRankings=false)", async () => {
    const supabase = createMockSupabase(null, { features_unlocked: false });

    const accessStatus = await getAccessStatus(supabase, "user-none");

    expect(accessStatus.subscriptionActive).toBe(false);
    expect(accessStatus.isPremium).toBe(false);

    const hasFullRankings = hasFeatureAccess(accessStatus, "full_rankings");
    expect(hasFullRankings).toBe(false);
  });
});

describe("dashboard wiring contract: active subscription → unlocked", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "true");
    const mod = await import("@/lib/subscription/check");
    getAccessStatus = mod.getAccessStatus;
    hasFeatureAccess = mod.hasFeatureAccess;
  });

  it("grants hasFullRankings=true for active madness_plus subscription", async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 30).toISOString();
    const supabase = createMockSupabase(
      { tier: "madness_plus", expires_at: futureDate },
      { features_unlocked: false },
    );

    const accessStatus = await getAccessStatus(supabase, "user-active");

    // Step 1: subscription recognized as active.
    expect(accessStatus.subscriptionActive).toBe(true);
    expect(accessStatus.isPremium).toBe(true);

    // Step 2: the dashboard's hasFullRankings derivation.
    const hasFullRankings = hasFeatureAccess(accessStatus, "full_rankings");
    expect(hasFullRankings).toBe(true);
  });

  it("grants hasFullRankings=true for referral-unlocked free user", async () => {
    // Free tier but referral unlock is permanent — mirrors a user who
    // shared with 3 friends and never purchased a subscription.
    const supabase = createMockSupabase(null, { features_unlocked: true });

    const accessStatus = await getAccessStatus(supabase, "user-referral");

    expect(accessStatus.subscriptionActive).toBe(false);
    expect(accessStatus.referralUnlocked).toBe(true);
    expect(accessStatus.isPremium).toBe(true);

    const hasFullRankings = hasFeatureAccess(accessStatus, "full_rankings");
    expect(hasFullRankings).toBe(true);
  });
});
