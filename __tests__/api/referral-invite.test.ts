/**
 * Referral Invite API Route Tests
 *
 * Tests the POST /api/referral/invite endpoint.
 * Key assertions:
 * - Returns referral link using request origin (never hardcoded)
 * - income_tier NEVER present in response
 * - No health data in referral link
 * - Requires authentication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/referral", () => ({
  ensureReferralCode: vi.fn().mockResolvedValue("TESTCODE"),
  buildReferralLink: vi.fn(
    (origin: string, code: string) => `${origin}/join?ref=${code}`,
  ),
}));

import { POST } from "@/app/api/referral/invite/route";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const mockCreateClient = vi.mocked(createClient);

function createMockRequest(origin = "https://test.example.com"): NextRequest {
  return new NextRequest("https://test.example.com/api/referral/invite", {
    method: "POST",
    headers: { origin },
  });
}

function mockAuthenticatedUser(userId = "user-1") {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe("POST /api/referral/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit("referral-invite");
  });

  it("returns 401 when not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(createMockRequest());
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns referral link and code on success", async () => {
    mockAuthenticatedUser();

    const res = await POST(createMockRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.referral_code).toBe("TESTCODE");
    expect(body.referral_link).toContain("test.example.com");
    expect(body.referral_link).toContain("ref=TESTCODE");
  });

  it("uses request origin for link (not hardcoded)", async () => {
    mockAuthenticatedUser();

    const res = await POST(createMockRequest("https://pr-preview.render.com"));
    const body = await res.json();
    expect(body.referral_link).toContain("pr-preview.render.com");
  });

  it("never includes income_tier in response", async () => {
    mockAuthenticatedUser();

    const res = await POST(createMockRequest());
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("income_tier");
  });

  it("referral link contains no health data", async () => {
    mockAuthenticatedUser();

    const res = await POST(createMockRequest());
    const body = await res.json();
    expect(body.referral_link).not.toContain("allergen");
    expect(body.referral_link).not.toContain("symptom");
    expect(body.referral_link).not.toContain("diagnosis");
  });

  it("returns rate limit headers on success", async () => {
    mockAuthenticatedUser();

    const res = await POST(createMockRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockAuthenticatedUser();

    // Exhaust the 10-request limit
    for (let i = 0; i < 10; i++) {
      const res = await POST(createMockRequest());
      expect(res.status).toBe(200);
    }

    // 11th request should be rate-limited
    const res = await POST(createMockRequest());
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.error).toContain("Too many requests");
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("rate limits are per-user, not global", async () => {
    // Exhaust limit for user-1
    mockAuthenticatedUser("user-1");
    for (let i = 0; i < 10; i++) {
      await POST(createMockRequest());
    }

    // user-2 should still be allowed
    mockAuthenticatedUser("user-2");
    const res = await POST(createMockRequest());
    expect(res.status).toBe(200);
  });
});
