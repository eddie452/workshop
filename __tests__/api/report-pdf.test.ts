/**
 * Report PDF API Route Tests
 *
 * Tests the GET /api/report/pdf endpoint.
 * Key assertions:
 * - Requires authentication
 * - Returns PDF content-type
 * - income_tier NEVER present in response
 * - Returns 404 when no allergen data
 * - Returns valid PDF buffer
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/pdf", () => ({
  generateReportPdf: vi.fn().mockReturnValue(
    new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
  ),
}));

import { GET } from "@/app/api/report/pdf/route";
import { createClient } from "@/lib/supabase/server";
import { generateReportPdf } from "@/lib/pdf";

const mockCreateClient = vi.mocked(createClient);
const mockGenerateReportPdf = vi.mocked(generateReportPdf);

function createMockSupabaseClient(overrides?: {
  user?: { id: string } | null;
  authError?: Error | null;
  profile?: Record<string, unknown> | null;
  profileError?: Error | null;
  eloRows?: unknown[] | null;
  eloError?: Error | null;
}) {
  const {
    user = { id: "user-123" },
    authError = null,
    profile = { display_name: "Test Child", home_region: "Southeast" },
    profileError = null,
    eloRows = [
      {
        allergen_id: "a1",
        elo_score: 1800,
        positive_signals: 20,
        negative_signals: 5,
        allergens: { common_name: "Oak", category: "tree" },
      },
      {
        allergen_id: "a2",
        elo_score: 1600,
        positive_signals: 15,
        negative_signals: 3,
        allergens: { common_name: "Ragweed", category: "weed" },
      },
    ],
    eloError = null,
  } = overrides ?? {};

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "user_profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({
                data: profile,
                error: profileError,
              }),
          }),
        }),
      };
    }
    if (table === "user_allergen_elo") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi
                .fn()
                .mockResolvedValue({
                  data: eloRows,
                  error: eloError,
                }),
            }),
          }),
        }),
      };
    }
    return {};
  });

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user }, error: authError }),
    },
    from: mockFrom,
  };
}

describe("GET /api/report/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: null,
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET();
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 on auth error", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        authError: new Error("Token expired"),
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 500 when profile fetch fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        profileError: new Error("DB error"),
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET();
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Failed to load profile");
  });

  it("returns 500 when elo fetch fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        eloError: new Error("DB error"),
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET();
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Failed to load leaderboard data");
  });

  it("returns 404 when no allergen data exists", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        eloRows: [],
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    const res = await GET();
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain("No allergen data");
  });

  it("returns PDF with correct content type and disposition", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient() as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      "allergy-madness-report.pdf"
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("calls generateReportPdf with correct input", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient() as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );

    await GET();

    expect(mockGenerateReportPdf).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateReportPdf.mock.calls[0][0];

    expect(callArg.childName).toBe("Test Child");
    expect(callArg.region).toBe("Southeast");
    expect(callArg.allergens).toHaveLength(2);
    expect(callArg.allergens[0].common_name).toBe("Oak");
    expect(callArg.allergens[0].rank).toBe(1);
    expect(callArg.allergens[1].common_name).toBe("Ragweed");
    expect(callArg.allergens[1].rank).toBe(2);
  });

  it("NEVER includes income_tier in PDF generation input", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient() as unknown as Awaited<
        ReturnType<typeof createClient>
      >
    );

    await GET();

    const callArg = mockGenerateReportPdf.mock.calls[0][0];
    const serialized = JSON.stringify(callArg);
    expect(serialized).not.toContain("income_tier");
    expect(serialized).not.toContain("income tier");
    expect(serialized).not.toContain("incomeTier");
  });

  it("uses fallback name when display_name is null", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        profile: { display_name: null, home_region: "Northeast" },
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await GET();

    const callArg = mockGenerateReportPdf.mock.calls[0][0];
    expect(callArg.childName).toBe("Your Child");
  });

  it("passes null region when home_region is null", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        profile: { display_name: "Test", home_region: null },
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await GET();

    const callArg = mockGenerateReportPdf.mock.calls[0][0];
    expect(callArg.region).toBeNull();
  });

  it("computes confidence tiers correctly", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        eloRows: [
          {
            allergen_id: "a1",
            elo_score: 1800,
            positive_signals: 25,
            negative_signals: 10,
            allergens: { common_name: "Oak", category: "tree" },
          },
          {
            allergen_id: "a2",
            elo_score: 1600,
            positive_signals: 10,
            negative_signals: 5,
            allergens: { common_name: "Ragweed", category: "weed" },
          },
          {
            allergen_id: "a3",
            elo_score: 1400,
            positive_signals: 5,
            negative_signals: 3,
            allergens: { common_name: "Mold", category: "mold" },
          },
          {
            allergen_id: "a4",
            elo_score: 1200,
            positive_signals: 2,
            negative_signals: 1,
            allergens: { common_name: "Dust", category: "indoor" },
          },
        ],
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await GET();

    const callArg = mockGenerateReportPdf.mock.calls[0][0];
    // 35 signals = very_high
    expect(callArg.allergens[0].confidence_tier).toBe("very_high");
    // 15 signals = high
    expect(callArg.allergens[1].confidence_tier).toBe("high");
    // 8 signals = medium
    expect(callArg.allergens[2].confidence_tier).toBe("medium");
    // 3 signals = low
    expect(callArg.allergens[3].confidence_tier).toBe("low");
  });
});
