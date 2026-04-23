import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server Supabase client. The callback now also calls
// `supabase.auth.getUser()` and queries `user_profiles.home_region`
// to decide the post-confirmation landing page (#282 — defense-in-depth
// with the middleware onboarding guard).
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
  }),
}));

const { GET } = await import("@/app/api/auth/callback/route");

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user with completed onboarding.
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockMaybeSingle.mockResolvedValue({
      data: { home_region: "pacific_northwest" },
      error: null,
    });
  });

  it("exchanges code for session and redirects to /dashboard for onboarded user", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=test-auth-code",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-auth-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("redirects new user without user_profiles row to /onboarding (#282)", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=test-auth-code",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/onboarding",
    );
  });

  it("redirects user with null home_region to /onboarding (#282)", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({
      data: { home_region: null },
      error: null,
    });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=test-auth-code",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/onboarding",
    );
  });

  it("redirects to custom next path when user is onboarded", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=test-code&next=/settings",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/settings",
    );
  });

  it("forces /onboarding even when next= is provided, if user is not onboarded", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=test-code&next=/dashboard",
    );
    const response = await GET(request);

    // Onboarding-incomplete overrides the `next` hint — otherwise a
    // fresh signup whose email link included `next=/dashboard` would
    // end up on the empty dashboard, reintroducing the P0 bug.
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/onboarding",
    );
  });

  it("redirects to /login when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error("Invalid code"),
    });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=bad-code",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("redirects to /login when no code is provided", async () => {
    const request = new Request(
      "http://localhost:3000/api/auth/callback",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
});
