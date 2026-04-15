/**
 * Leaderboard API Route Tests
 *
 * Validates the GET /api/leaderboard endpoint:
 * - Returns ranked allergens for authenticated users
 * - Requires authentication
 * - Never returns income_tier
 * - Computes confidence tiers correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/* Mock setup                                                          */
/* ------------------------------------------------------------------ */

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockIs = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Also mock next/headers to avoid cookie errors in test
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

import { GET } from "@/app/api/leaderboard/route";

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function setupAuth(user: { id: string } | null) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: "Not authenticated" },
  });
}

function setupProfile(profile: { fda_acknowledged: boolean } | null) {
  // Profile query chain: from("user_profiles").select().eq().single()
  const profileSingle = vi.fn().mockResolvedValue({
    data: profile,
    error: profile ? null : { message: "Not found" },
  });
  const profileEq = vi.fn().mockReturnValue({ single: profileSingle });
  const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });

  return { select: profileSelect, eq: profileEq, single: profileSingle };
}

function setupSubscription(tier: string | null) {
  const subSingle = vi.fn().mockResolvedValue({
    data: tier ? { tier } : null,
    error: null,
  });
  const subEq = vi.fn().mockReturnValue({ single: subSingle });
  const subSelect = vi.fn().mockReturnValue({ eq: subEq });

  return { select: subSelect, eq: subEq, single: subSingle };
}

function setupEloRows(
  rows: Array<{
    allergen_id: string;
    elo_score: number;
    positive_signals: number;
    negative_signals: number;
    allergens: { common_name: string; category: string };
  }> | null
) {
  const eloOrder = vi.fn().mockResolvedValue({
    data: rows,
    error: rows === null ? { message: "Query error" } : null,
  });
  const eloIs = vi.fn().mockReturnValue({ order: eloOrder });
  const eloEq = vi.fn().mockReturnValue({ is: eloIs });
  const eloSelect = vi.fn().mockReturnValue({ eq: eloEq });

  return { select: eloSelect, eq: eloEq, is: eloIs, order: eloOrder };
}

describe("GET /api/leaderboard", () => {
  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns ranked allergens for authenticated user", async () => {
    setupAuth({ id: "user-123" });

    const profileMock = setupProfile({ fda_acknowledged: true });
    const subMock = setupSubscription("free");
    const eloMock = setupEloRows([
      {
        allergen_id: "oak",
        elo_score: 1650,
        positive_signals: 20,
        negative_signals: 5,
        allergens: { common_name: "Oak", category: "tree" },
      },
      {
        allergen_id: "birch",
        elo_score: 1500,
        positive_signals: 5,
        negative_signals: 2,
        allergens: { common_name: "Birch", category: "tree" },
      },
    ]);

    // Set up from() to return different mocks for different tables
    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        return { select: profileMock.select };
      }
      if (table === "user_subscriptions") {
        return { select: subMock.select };
      }
      if (table === "user_allergen_elo") {
        return { select: eloMock.select };
      }
      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.allergens).toHaveLength(2);
    expect(json.allergens[0].allergen_id).toBe("oak");
    expect(json.allergens[0].rank).toBe(1);
    expect(json.allergens[0].common_name).toBe("Oak");
    expect(json.allergens[1].rank).toBe(2);
    expect(json.isPremium).toBe(false);
    expect(json.isEnvironmentalForecast).toBe(false);
    expect(json.fdaAcknowledged).toBe(true);
  });

  it("does NOT include income_tier in response", async () => {
    setupAuth({ id: "user-123" });

    const profileMock = setupProfile({ fda_acknowledged: true });
    const subMock = setupSubscription("free");
    const eloMock = setupEloRows([
      {
        allergen_id: "oak",
        elo_score: 1650,
        positive_signals: 20,
        negative_signals: 5,
        allergens: { common_name: "Oak", category: "tree" },
      },
    ]);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") return { select: profileMock.select };
      if (table === "user_subscriptions") return { select: subMock.select };
      if (table === "user_allergen_elo") return { select: eloMock.select };
      return {};
    });

    const response = await GET();
    const text = await response.text();

    expect(text).not.toContain("income_tier");
  });

  it("returns isEnvironmentalForecast=true when no Elo data", async () => {
    setupAuth({ id: "user-123" });

    const profileMock = setupProfile({ fda_acknowledged: false });
    const subMock = setupSubscription("free");
    const eloMock = setupEloRows([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") return { select: profileMock.select };
      if (table === "user_subscriptions") return { select: subMock.select };
      if (table === "user_allergen_elo") return { select: eloMock.select };
      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(json.isEnvironmentalForecast).toBe(true);
    expect(json.allergens).toHaveLength(0);
  });

  it("returns isPremium=true for madness_plus subscribers", async () => {
    setupAuth({ id: "user-123" });

    const profileMock = setupProfile({ fda_acknowledged: true });
    const subMock = setupSubscription("madness_plus");
    const eloMock = setupEloRows([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") return { select: profileMock.select };
      if (table === "user_subscriptions") return { select: subMock.select };
      if (table === "user_allergen_elo") return { select: eloMock.select };
      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(json.isPremium).toBe(true);
  });

  it("computes confidence tiers correctly", async () => {
    setupAuth({ id: "user-123" });

    const profileMock = setupProfile({ fda_acknowledged: true });
    const subMock = setupSubscription("free");
    const eloMock = setupEloRows([
      {
        allergen_id: "a",
        elo_score: 1800,
        positive_signals: 25,
        negative_signals: 10, // 35 total -> very_high
        allergens: { common_name: "A", category: "tree" },
      },
      {
        allergen_id: "b",
        elo_score: 1600,
        positive_signals: 10,
        negative_signals: 5, // 15 total -> high
        allergens: { common_name: "B", category: "grass" },
      },
      {
        allergen_id: "c",
        elo_score: 1400,
        positive_signals: 5,
        negative_signals: 3, // 8 total -> medium
        allergens: { common_name: "C", category: "weed" },
      },
      {
        allergen_id: "d",
        elo_score: 1200,
        positive_signals: 2,
        negative_signals: 1, // 3 total -> low
        allergens: { common_name: "D", category: "mold" },
      },
    ]);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") return { select: profileMock.select };
      if (table === "user_subscriptions") return { select: subMock.select };
      if (table === "user_allergen_elo") return { select: eloMock.select };
      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(json.allergens[0].confidence_tier).toBe("very_high");
    expect(json.allergens[1].confidence_tier).toBe("high");
    expect(json.allergens[2].confidence_tier).toBe("medium");
    expect(json.allergens[3].confidence_tier).toBe("low");

    // #160: numeric score is populated alongside the tier string.
    // All four are in [0, 1] and non-null.
    for (const a of json.allergens) {
      expect(typeof a.score).toBe("number");
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(1);
    }
    // 15 signals sits between the 14-anchor (0.75) and 30-anchor (0.9)
    // inclusive-left, so rank #2 (15 signals) should be >= 0.75.
    expect(json.allergens[1].score).toBeGreaterThanOrEqual(0.75);
    // 3 signals is below the first boundary (7 -> 0.5).
    expect(json.allergens[3].score).toBeLessThan(0.5);
  });
});
