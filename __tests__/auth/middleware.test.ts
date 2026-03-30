import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the middleware redirect logic.
 *
 * We mock the Supabase middleware helper to control the user state,
 * then verify the middleware redirects correctly.
 */

// Mock the Supabase middleware helper
const mockUpdateSession = vi.fn();
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

// We need to mock NextResponse for redirect detection
const mockRedirect = vi.fn();
vi.mock("next/server", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    NextResponse: {
      ...((actual.NextResponse as Record<string, unknown>) || {}),
      next: vi.fn(() => ({ type: "next" })),
      redirect: (...args: unknown[]) => {
        mockRedirect(...args);
        return { type: "redirect", url: args[0] };
      },
    },
  };
});

// Import middleware after mocks are set up
const { middleware } = await import("@/middleware");

function createMockRequest(pathname: string): unknown {
  const url = new URL(`http://localhost:3000${pathname}`);
  // Add clone method to mimic NextURL behavior
  const nextUrl = Object.assign(url, {
    clone() {
      const cloned = new URL(url.href);
      return Object.assign(cloned, { clone: () => new URL(url.href) });
    },
  });
  return {
    nextUrl,
    cookies: {
      getAll: () => [],
    },
  };
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user from /dashboard to /login", async () => {
    const mockResponse = { type: "next" };
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    });

    const request = createMockRequest("/dashboard");
    const response = await middleware(request as never);

    expect(response).toBeDefined();
    expect(response.type).toBe("redirect");
  });

  it("redirects authenticated user from /login to /dashboard", async () => {
    const mockResponse = { type: "next" };
    mockUpdateSession.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      supabaseResponse: mockResponse,
    });

    const request = createMockRequest("/login");
    const response = await middleware(request as never);

    expect(response).toBeDefined();
    expect(response.type).toBe("redirect");
  });

  it("redirects authenticated user from /signup to /dashboard", async () => {
    const mockResponse = { type: "next" };
    mockUpdateSession.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      supabaseResponse: mockResponse,
    });

    const request = createMockRequest("/signup");
    const response = await middleware(request as never);

    expect(response).toBeDefined();
    expect(response.type).toBe("redirect");
  });

  it("allows unauthenticated user to access /login", async () => {
    const mockResponse = { type: "next" };
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    });

    const request = createMockRequest("/login");
    const response = await middleware(request as never);

    expect(response).toBe(mockResponse);
  });

  it("allows authenticated user to access /dashboard", async () => {
    const mockResponse = { type: "next" };
    mockUpdateSession.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      supabaseResponse: mockResponse,
    });

    const request = createMockRequest("/dashboard");
    const response = await middleware(request as never);

    expect(response).toBe(mockResponse);
  });

  it("allows unauthenticated user to access public routes", async () => {
    const mockResponse = { type: "next" };
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    });

    const request = createMockRequest("/");
    const response = await middleware(request as never);

    expect(response).toBe(mockResponse);
  });

  it("redirects unauthenticated user from all protected paths", async () => {
    const protectedPaths = [
      "/dashboard",
      "/checkin",
      "/onboarding",
      "/travel",
      "/children",
      "/scout",
      "/settings",
    ];

    for (const path of protectedPaths) {
      vi.clearAllMocks();
      const mockResponse = { type: "next" };
      mockUpdateSession.mockResolvedValue({
        user: null,
        supabaseResponse: mockResponse,
      });

      const request = createMockRequest(path);
      const response = await middleware(request as never);

      expect(response.type).toBe("redirect");
    }
  });
});
