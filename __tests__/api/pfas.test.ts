/**
 * PFAS API Route Tests
 *
 * Tests the GET /api/pfas endpoint logic.
 * Covers: authentication, premium vs free response, error handling, no data.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/subscription/check", () => ({
  isFeatureAvailable: vi.fn(),
}));

vi.mock("@/lib/pfas/get-pfas-data", () => ({
  getPfasData: vi.fn(),
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { isFeatureAvailable } from "@/lib/subscription/check";
import { getPfasData } from "@/lib/pfas/get-pfas-data";

// Import after mocks
import { GET } from "@/app/api/pfas/route";

function createMockSupabase(overrides: {
  user?: { id: string; email: string } | null;
  authError?: { message: string } | null;
  eloRows?: { allergen_id: string }[] | null;
  eloError?: { message: string } | null;
} = {}) {
  const {
    user = { id: "user-123", email: "test@example.com" },
    authError = null,
    eloRows = null,
    eloError = null,
  } = overrides;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: eloRows,
                error: eloError,
              }),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("GET /api/pfas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const mockSupabase = createMockSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await GET();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when auth has an error", async () => {
    const mockSupabase = createMockSupabase({
      user: null,
      authError: { message: "Invalid token" },
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 500 when Elo fetch fails", async () => {
    const mockSupabase = createMockSupabase({
      eloError: { message: "Database connection failed" },
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(isFeatureAvailable).mockResolvedValue(true);

    const response = await GET();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Failed to load allergen data");
  });

  it("returns empty entries when user has no allergens", async () => {
    const mockSupabase = createMockSupabase({ eloRows: [] });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(isFeatureAvailable).mockResolvedValue(true);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toEqual([]);
    expect(body.hasData).toBe(false);
    expect(body.isPremium).toBe(true);
  });

  it("returns full food lists for premium users", async () => {
    const mockSupabase = createMockSupabase({
      eloRows: [{ allergen_id: "birch" }, { allergen_id: "ragweed" }],
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(isFeatureAvailable).mockResolvedValue(true);
    vi.mocked(getPfasData).mockReturnValue({
      entries: [
        {
          allergen_id: "birch",
          common_name: "Birch",
          category: "tree",
          cross_reactive_foods: ["apple", "pear", "cherry"],
          pfas_severity: "moderate",
        },
      ],
      hasData: true,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isPremium).toBe(true);
    expect(body.hasData).toBe(true);
    expect(body.entries[0].cross_reactive_foods).toEqual([
      "apple",
      "pear",
      "cherry",
    ]);
  });

  it("strips food lists for free-tier users", async () => {
    const mockSupabase = createMockSupabase({
      eloRows: [{ allergen_id: "birch" }],
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(isFeatureAvailable).mockResolvedValue(false);
    vi.mocked(getPfasData).mockReturnValue({
      entries: [
        {
          allergen_id: "birch",
          common_name: "Birch",
          category: "tree",
          cross_reactive_foods: ["apple", "pear", "cherry"],
          pfas_severity: "moderate",
        },
      ],
      hasData: true,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isPremium).toBe(false);
    expect(body.hasData).toBe(true);
    // Free users get empty food lists
    expect(body.entries[0].cross_reactive_foods).toEqual([]);
    // But allergen name and severity are still present
    expect(body.entries[0].common_name).toBe("Birch");
    expect(body.entries[0].pfas_severity).toBe("moderate");
  });

  it("passes top 5 allergen IDs to getPfasData", async () => {
    const eloRows = [
      { allergen_id: "birch" },
      { allergen_id: "ragweed" },
      { allergen_id: "dust_mite" },
      { allergen_id: "cat" },
      { allergen_id: "grass" },
    ];
    const mockSupabase = createMockSupabase({ eloRows });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(isFeatureAvailable).mockResolvedValue(true);
    vi.mocked(getPfasData).mockReturnValue({ entries: [], hasData: false });

    await GET();

    expect(getPfasData).toHaveBeenCalledWith([
      "birch",
      "ragweed",
      "dust_mite",
      "cat",
      "grass",
    ]);
  });

  it("income_tier is NEVER present in any response", async () => {
    const mockSupabase = createMockSupabase({
      eloRows: [{ allergen_id: "birch" }],
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(isFeatureAvailable).mockResolvedValue(true);
    vi.mocked(getPfasData).mockReturnValue({
      entries: [
        {
          allergen_id: "birch",
          common_name: "Birch",
          category: "tree",
          cross_reactive_foods: ["apple"],
          pfas_severity: "mild_oas",
        },
      ],
      hasData: true,
    });

    const response = await GET();
    const body = await response.json();
    const bodyStr = JSON.stringify(body);

    expect(bodyStr).not.toContain("income_tier");
    expect(bodyStr).not.toContain("median_income");
  });
});
