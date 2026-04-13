/**
 * Referral Tracking Logic Tests
 *
 * Tests server-side referral operations:
 * - Ensure referral code generation and persistence
 * - Referral status retrieval
 * - Recording referrals and incrementing counts
 * - 3-friend threshold unlock (permanent, never reverts)
 * - Self-referral prevention
 * - Duplicate referral prevention
 *
 * IMPORTANT: income_tier must NEVER appear in any test output.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ensureReferralCode,
  getReferralStatus,
  recordReferral,
} from "@/lib/referral/tracking";
import { REFERRAL_UNLOCK_THRESHOLD } from "@/lib/referral/constants";

/* ------------------------------------------------------------------ */
/* Mock Supabase client                                                */
/* ------------------------------------------------------------------ */

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockFrom = vi.fn();

  const defaultChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  mockFrom.mockReturnValue({ ...defaultChain, ...overrides });

  return { from: mockFrom, _chain: defaultChain } as unknown as Parameters<
    typeof ensureReferralCode
  >[0] & { from: ReturnType<typeof vi.fn>; _chain: typeof defaultChain };
}

describe("ensureReferralCode", () => {
  it("returns existing code if user already has one", async () => {
    const supabase = createMockSupabase();
    // First call: select referral_code
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_code: "EXISTING1" },
            error: null,
          }),
        }),
      }),
    });

    const code = await ensureReferralCode(supabase, "user-1");
    expect(code).toBe("EXISTING1");
  });

  it("generates and saves a new code if user has none", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const supabase = createMockSupabase();
    // First call: select returns null code
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_code: null },
            error: null,
          }),
        }),
      }),
    });
    // Second call: update with new code
    supabase.from.mockReturnValueOnce({
      update: updateMock,
    });

    const code = await ensureReferralCode(supabase, "user-1");
    expect(code).toHaveLength(8);
    expect(updateMock).toHaveBeenCalled();
  });

  it("retries on unique constraint violation", async () => {
    const supabase = createMockSupabase();
    // First call: select returns null code
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_code: null },
            error: null,
          }),
        }),
      }),
    });
    // Second call: update fails with constraint violation
    supabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { code: "23505", message: "duplicate key" },
        }),
      }),
    });
    // Third call: update succeeds
    supabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const code = await ensureReferralCode(supabase, "user-1");
    expect(code).toHaveLength(8);
  });
});

describe("getReferralStatus", () => {
  it("returns status with correct referrals_needed", async () => {
    const supabase = createMockSupabase();
    // ensureReferralCode call
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_code: "TESTCODE" },
            error: null,
          }),
        }),
      }),
    });
    // getReferralStatus profile fetch
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_count: 1, features_unlocked: false },
            error: null,
          }),
        }),
      }),
    });

    const status = await getReferralStatus(supabase, "user-1");

    expect(status.referral_code).toBe("TESTCODE");
    expect(status.referral_count).toBe(1);
    expect(status.features_unlocked).toBe(false);
    expect(status.referrals_needed).toBe(REFERRAL_UNLOCK_THRESHOLD - 1);
  });

  it("returns 0 referrals_needed when unlocked", async () => {
    const supabase = createMockSupabase();
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_code: "TESTCODE" },
            error: null,
          }),
        }),
      }),
    });
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { referral_count: 3, features_unlocked: true },
            error: null,
          }),
        }),
      }),
    });

    const status = await getReferralStatus(supabase, "user-1");
    expect(status.features_unlocked).toBe(true);
    expect(status.referrals_needed).toBe(0);
  });
});

describe("recordReferral", () => {
  function createRpcSupabase(rpcResult: { data: unknown; error: { message: string } | null }) {
    const supabase = createMockSupabase();
    (supabase as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc = vi.fn().mockResolvedValue(rpcResult);
    return supabase as typeof supabase & { rpc: ReturnType<typeof vi.fn> };
  }

  it("rejects invalid referral code", async () => {
    const supabase = createRpcSupabase({
      data: { success: false, error: "Invalid referral code" },
      error: null,
    });

    const result = await recordReferral(supabase, "BADCODE1", "new-user");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid referral code");
  });

  it("prevents self-referral", async () => {
    const supabase = createRpcSupabase({
      data: { success: false, error: "Cannot refer yourself" },
      error: null,
    });

    const result = await recordReferral(supabase, "TESTCODE", "user-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot refer yourself");
  });

  it("prevents duplicate referral", async () => {
    const supabase = createRpcSupabase({
      data: { success: false, error: "Referral already recorded" },
      error: null,
    });

    const result = await recordReferral(supabase, "TESTCODE", "new-user");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Referral already recorded");
  });

  it("records referral and increments count", async () => {
    const supabase = createRpcSupabase({
      data: { success: true, features_unlocked: false },
      error: null,
    });

    const result = await recordReferral(supabase, "TESTCODE", "new-user");
    expect(result.success).toBe(true);
    expect(result.features_unlocked).toBe(false);
    expect(supabase.rpc).toHaveBeenCalledWith("record_referral", {
      p_referral_code: "TESTCODE",
      p_referred_id: "new-user",
    });
  });

  it("unlocks features at threshold (3 referrals)", async () => {
    const supabase = createRpcSupabase({
      data: { success: true, features_unlocked: true },
      error: null,
    });

    const result = await recordReferral(supabase, "TESTCODE", "new-user");
    expect(result.success).toBe(true);
    expect(result.features_unlocked).toBe(true);
  });

  it("unlock is permanent — already unlocked referrer stays unlocked", async () => {
    const supabase = createRpcSupabase({
      data: { success: true, features_unlocked: true },
      error: null,
    });

    const result = await recordReferral(supabase, "TESTCODE", "new-user-5");
    expect(result.success).toBe(true);
    expect(result.features_unlocked).toBe(true);
  });

  it("returns error when RPC call fails (transaction rollback)", async () => {
    const supabase = createRpcSupabase({
      data: null,
      error: { message: "database connection lost" },
    });

    const result = await recordReferral(supabase, "TESTCODE", "new-user");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Transaction failed");
  });
});
