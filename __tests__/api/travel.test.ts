/**
 * Travel Mode API Route Tests
 *
 * Tests the GET / POST / DELETE /api/travel endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/travel", () => ({
  activateTravel: vi.fn(),
  deactivateTravel: vi.fn(),
  getActiveSession: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  activateTravel,
  deactivateTravel,
  getActiveSession,
} from "@/lib/travel";
import { GET, POST, DELETE } from "@/app/api/travel/route";

function mockSupabase(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
}

describe("GET /api/travel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabase(null) as never);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the active session for the authenticated user", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(getActiveSession).mockResolvedValue({
      id: "sess-1",
      location_id: "loc-1",
      started_at: "2026-04-16T00:00:00.000Z",
    });

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.session?.id).toBe("sess-1");
  });

  it("returns null session when there is no active session", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(getActiveSession).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.session).toBeNull();
  });
});

describe("POST /api/travel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabase(null) as never);
    const req = new Request("http://localhost/api/travel", {
      method: "POST",
      body: JSON.stringify({ lat: 40.7, lng: -74.0 }),
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 200 with a session on successful activation", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(activateTravel).mockResolvedValue({
      success: true,
      session: {
        id: "sess-1",
        location_id: "loc-1",
        started_at: "2026-04-16T00:00:00.000Z",
      },
    });

    const req = new Request("http://localhost/api/travel", {
      method: "POST",
      body: JSON.stringify({ lat: 40.7, lng: -74.0 }),
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.session.id).toBe("sess-1");
  });

  it("returns 409 when an active session already exists", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(activateTravel).mockResolvedValue({
      success: false,
      error: "An active travel session already exists",
      code: "active_session_exists",
    });

    const req = new Request("http://localhost/api/travel", {
      method: "POST",
      body: JSON.stringify({ lat: 40.7, lng: -74.0 }),
    });
    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it("returns 400 on invalid coordinates", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(activateTravel).mockResolvedValue({
      success: false,
      error: "Invalid coordinates",
      code: "validation",
    });

    const req = new Request("http://localhost/api/travel", {
      method: "POST",
      body: JSON.stringify({ lat: 999, lng: 0 }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when the body is not valid JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    const req = new Request("http://localhost/api/travel", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/travel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabase(null) as never);
    const response = await DELETE();
    expect(response.status).toBe(401);
  });

  it("returns 200 when deactivation succeeds", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(deactivateTravel).mockResolvedValue({
      success: true,
      session: {
        id: "sess-1",
        location_id: "loc-1",
        started_at: "2026-04-16T00:00:00.000Z",
      },
    });
    const response = await DELETE();
    expect(response.status).toBe(200);
  });

  it("returns 404 when there is no active session", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({ id: "user-123" }) as never,
    );
    vi.mocked(deactivateTravel).mockResolvedValue({
      success: false,
      error: "No active travel session",
      code: "no_active_session",
    });
    const response = await DELETE();
    expect(response.status).toBe(404);
  });
});
