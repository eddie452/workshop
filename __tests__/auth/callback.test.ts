import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server Supabase client
const mockExchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

const { GET } = await import("@/app/api/auth/callback/route");

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges code for session and redirects to /dashboard", async () => {
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

  it("redirects to custom next path after code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = new Request(
      "http://localhost:3000/api/auth/callback?code=test-code&next=/onboarding",
    );
    const response = await GET(request);

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
