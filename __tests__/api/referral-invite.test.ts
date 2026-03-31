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

describe("POST /api/referral/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(createMockRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.referral_code).toBe("TESTCODE");
    expect(body.referral_link).toContain("test.example.com");
    expect(body.referral_link).toContain("ref=TESTCODE");
  });

  it("uses request origin for link (not hardcoded)", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(createMockRequest("https://pr-preview.render.com"));
    const body = await res.json();
    expect(body.referral_link).toContain("pr-preview.render.com");
  });

  it("never includes income_tier in response", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(createMockRequest());
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("income_tier");
  });

  it("referral link contains no health data", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(createMockRequest());
    const body = await res.json();
    expect(body.referral_link).not.toContain("allergen");
    expect(body.referral_link).not.toContain("symptom");
    expect(body.referral_link).not.toContain("diagnosis");
  });
});
