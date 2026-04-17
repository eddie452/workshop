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

  it("populates the two-layer confidence fields (#193) with per-allergen separation", async () => {
    // Post-#193 the leaderboard emits two new numeric surfaces:
    //   - `discriminative` — Elo-separation sigmoid (varies between #1 and #N)
    //   - `posterior`      — Monte Carlo top-K frequency (drives tier string)
    // The legacy `score` now maps to `discriminative` for back-compat, so
    // #1 and #N must have visibly different scores (the core DoD — the
    // 21% flat-line bug the ticket was filed for).
    setupAuth({ id: "user-123" });

    const profileMock = setupProfile({ fda_acknowledged: true });
    const subMock = setupSubscription("free");
    const eloMock = setupEloRows([
      {
        allergen_id: "a",
        elo_score: 1800,
        positive_signals: 25,
        negative_signals: 10,
        allergens: { common_name: "A", category: "tree" },
      },
      {
        allergen_id: "b",
        elo_score: 1600,
        positive_signals: 10,
        negative_signals: 5,
        allergens: { common_name: "B", category: "grass" },
      },
      {
        allergen_id: "c",
        elo_score: 1400,
        positive_signals: 5,
        negative_signals: 3,
        allergens: { common_name: "C", category: "weed" },
      },
      {
        allergen_id: "d",
        elo_score: 1200,
        positive_signals: 2,
        negative_signals: 1,
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

    // All four numeric surfaces are populated and in [0, 1].
    for (const a of json.allergens) {
      expect(typeof a.score).toBe("number");
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(1);
      expect(typeof a.discriminative).toBe("number");
      expect(typeof a.posterior).toBe("number");
    }

    // Core DoD: #1 and #N differ on the discriminative layer.
    expect(json.allergens[0].discriminative).not.toBe(
      json.allergens[3].discriminative,
    );
    expect(json.allergens[0].discriminative).toBeGreaterThan(
      json.allergens[3].discriminative,
    );

    // `score` is back-compat alias for `discriminative`.
    expect(json.allergens[0].score).toBe(json.allergens[0].discriminative);

    // Posterior is in [0, 1] and every allergen in a 4-entry leaderboard
    // with topK=4 deterministically finishes top-4, so posterior=1 for all.
    for (const a of json.allergens) {
      expect(a.posterior).toBe(1);
    }

    // Tier strings are valid enum values.
    for (const a of json.allergens) {
      expect(["low", "medium", "high", "very_high"]).toContain(
        a.confidence_tier,
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* Per-user posterior seeding (#229)                                   */
/* ------------------------------------------------------------------ */

describe("per-user posterior seeding (#229)", () => {
  it("two different user IDs produce different posterior maps on the same leaderboard", async () => {
    // Exercise `buildRankedFromEloRows` directly — same helper the
    // route delegates to. A regression to `seed: 0` for all users
    // would produce byte-identical maps and fail this test.
    const { buildRankedFromEloRows } = await import(
      "@/lib/engine/ranked-leaderboard"
    );
    const { hashStringToInt32 } = await import("@/lib/engine/hash");

    // Enough entries (> default topK=4) with close Elos so tail
    // allergens fall in and out of the top-K across Monte Carlo
    // runs, making the posterior map genuinely seed-dependent.
    const rows = [
      { allergen_id: "a", elo_score: 1650, positive_signals: 10, negative_signals: 3, common_name: "A", category: "tree" },
      { allergen_id: "b", elo_score: 1620, positive_signals: 9,  negative_signals: 3, common_name: "B", category: "tree" },
      { allergen_id: "c", elo_score: 1600, positive_signals: 8,  negative_signals: 3, common_name: "C", category: "grass" },
      { allergen_id: "d", elo_score: 1585, positive_signals: 7,  negative_signals: 3, common_name: "D", category: "grass" },
      { allergen_id: "e", elo_score: 1570, positive_signals: 6,  negative_signals: 3, common_name: "E", category: "weed" },
      { allergen_id: "f", elo_score: 1555, positive_signals: 5,  negative_signals: 3, common_name: "F", category: "weed" },
      { allergen_id: "g", elo_score: 1540, positive_signals: 4,  negative_signals: 3, common_name: "G", category: "mold" },
      { allergen_id: "h", elo_score: 1525, positive_signals: 3,  negative_signals: 3, common_name: "H", category: "mold" },
    ];

    const userA = "user-alpha";
    const userB = "user-beta";

    const resultA = buildRankedFromEloRows(rows, {
      seed: hashStringToInt32(userA),
      scoreSource: "discriminative",
    });
    const resultB = buildRankedFromEloRows(rows, {
      seed: hashStringToInt32(userB),
      scoreSource: "discriminative",
    });

    // Sanity: the hashes themselves differ.
    expect(hashStringToInt32(userA)).not.toBe(hashStringToInt32(userB));

    // Core assertion: posterior maps are NOT byte-identical.
    const posteriorsA = resultA.allergens.map((a) => a.posterior);
    const posteriorsB = resultB.allergens.map((a) => a.posterior);
    expect(posteriorsA).not.toEqual(posteriorsB);
  });
});
