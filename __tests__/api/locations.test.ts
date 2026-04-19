/**
 * /api/locations Route Tests
 *
 * Covers:
 *  - 401 when unauthenticated.
 *  - 400 when PATCH/DELETE are missing ?id=.
 *  - 403 when mutating a home row (propagated from the service layer).
 *  - 404 when the row does not belong to the user.
 *  - Happy-path 200 on GET, POST, PATCH, DELETE.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/saved-places", async () => {
  return {
    listPlaces: vi.fn(),
    createPlace: vi.fn(),
    updatePlace: vi.fn(),
    deletePlace: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  listPlaces,
  createPlace,
  updatePlace,
  deletePlace,
} from "@/lib/saved-places";
import { GET, POST, PATCH, DELETE } from "@/app/api/locations/route";

function authedSupabase(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/locations", () => {
  it("returns 401 when unauthenticated", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase(null),
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the list on success", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (listPlaces as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "p1",
        nickname: "Grandma",
        address: null,
        lat: null,
        lng: null,
        zip: null,
        state: null,
        last_visit: null,
        visit_count: 0,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.places).toHaveLength(1);
  });
});

describe("POST /api/locations", () => {
  it("returns 401 when unauthenticated", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase(null),
    );
    const req = new Request("http://localhost/api/locations", {
      method: "POST",
      body: JSON.stringify({ nickname: "X" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation failure", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (createPlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Nickname is required",
    });
    const req = new Request("http://localhost/api/locations", {
      method: "POST",
      body: JSON.stringify({ nickname: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns created place on success", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (createPlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      place: {
        id: "p1",
        nickname: "Grandma",
        address: null,
        lat: null,
        lng: null,
        zip: null,
        state: null,
        last_visit: null,
        visit_count: 0,
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    const req = new Request("http://localhost/api/locations", {
      method: "POST",
      body: JSON.stringify({ nickname: "Grandma" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.place.id).toBe("p1");
  });
});

describe("PATCH /api/locations", () => {
  it("returns 401 when unauthenticated", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase(null),
    );
    const req = new Request("http://localhost/api/locations?id=p1", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "Y" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    const req = new Request("http://localhost/api/locations", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "Y" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when mutating a home row", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (updatePlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Home location cannot be modified through this API",
      status: 403,
    });
    const req = new Request("http://localhost/api/locations?id=home-1", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "Hack" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when place is missing or owned by another user", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (updatePlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Saved place not found",
      status: 404,
    });
    const req = new Request("http://localhost/api/locations?id=other", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "Y" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (updatePlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
    const req = new Request("http://localhost/api/locations?id=p1", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "Renamed" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/locations", () => {
  it("returns 401 when unauthenticated", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase(null),
    );
    const req = new Request("http://localhost/api/locations?id=p1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    const req = new Request("http://localhost/api/locations", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when deleting a home row", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (deletePlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Home location cannot be deleted through this API",
      status: 403,
    });
    const req = new Request("http://localhost/api/locations?id=home-1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when deleting another user's place", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (deletePlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Saved place not found",
      status: 404,
    });
    const req = new Request("http://localhost/api/locations?id=other", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      authedSupabase("user-1"),
    );
    (deletePlace as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
    const req = new Request("http://localhost/api/locations?id=p1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });
});
