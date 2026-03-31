/**
 * Referral Status API Route Tests
 *
 * Tests the GET /api/referral/status endpoint.
 * Key assertions:
 * - Returns referral count and unlock status
 * - income_tier NEVER present in response
 * - Requires authentication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/referral", () => ({
  getReferralStatus: vi.fn().mockResolvedValue({
    referral_code: "TESTCODE",
    referral_count: 2,
    features_unlocked: false,
    referrals_needed: 1,
  }),
}));

import { GET } from "@/app/api/referral/status/route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = vi.mocked(createClient);

describe("GET /api/referral/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns referral status on success", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.referral_code).toBe("TESTCODE");
    expect(body.referral_count).toBe(2);
    expect(body.features_unlocked).toBe(false);
    expect(body.referrals_needed).toBe(1);
  });

  it("never includes income_tier in response", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("income_tier");
  });
});
