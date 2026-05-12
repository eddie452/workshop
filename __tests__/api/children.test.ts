/**
 * Children API Route Tests
 *
 * Tests the GET/POST/PATCH/DELETE /api/children endpoint logic.
 * Covers: authentication, ungated free-tier access (#288), ownership.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/child-profiles", () => ({
  listChildren: vi.fn(),
  createChild: vi.fn(),
  updateChild: vi.fn(),
  deleteChild: vi.fn(),
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  listChildren,
  createChild,
  updateChild,
  deleteChild,
} from "@/lib/child-profiles";

// Import after mocks
import { GET, POST, PATCH, DELETE } from "@/app/api/children/route";

function mockAuth(user: { id: string } | null) {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
  vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
  return mockSupabase;
}

describe("Children API — auth boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when user is not authenticated", async () => {
    mockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("POST returns 401 when user is not authenticated", async () => {
    mockAuth(null);
    const req = new Request("http://localhost/api/children", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when user is not authenticated", async () => {
    mockAuth(null);
    const req = new Request("http://localhost/api/children?id=child-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when user is not authenticated", async () => {
    mockAuth(null);
    const req = new Request("http://localhost/api/children?id=child-1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });
});

describe("Children API — ungated free-tier access (#288)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns the user's children for any authenticated user (no 403)", async () => {
    mockAuth({ id: "free-user-1" });
    vi.mocked(listChildren).mockResolvedValue([
      { id: "child-1", name: "Sam", birth_year: 2018 },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.children).toHaveLength(1);
    expect(body.children[0].name).toBe("Sam");
    // Ownership preserved — user.id scoped to the data layer
    expect(listChildren).toHaveBeenCalledWith(expect.anything(), "free-user-1");
  });

  it("POST creates a child for a free-tier authenticated user (no 403)", async () => {
    mockAuth({ id: "free-user-1" });
    vi.mocked(createChild).mockResolvedValue({
      success: true,
      child: { id: "child-new", name: "Sam", birth_year: 2018 },
    } as never);

    const req = new Request("http://localhost/api/children", {
      method: "POST",
      body: JSON.stringify({ name: "Sam", birth_year: 2018 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.child.name).toBe("Sam");
    // Ownership preserved — passes user.id through
    expect(createChild).toHaveBeenCalledWith(
      expect.anything(),
      "free-user-1",
      { name: "Sam", birth_year: 2018 },
    );
  });

  it("PATCH updates a child for a free-tier authenticated user (no 403)", async () => {
    mockAuth({ id: "free-user-1" });
    vi.mocked(updateChild).mockResolvedValue({ success: true } as never);

    const req = new Request("http://localhost/api/children?id=child-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Sam Renamed" }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Ownership preserved — user.id scoped through
    expect(updateChild).toHaveBeenCalledWith(
      expect.anything(),
      "child-1",
      "free-user-1",
      { name: "Sam Renamed" },
    );
  });

  it("DELETE removes a child for a free-tier authenticated user (no 403)", async () => {
    mockAuth({ id: "free-user-1" });
    vi.mocked(deleteChild).mockResolvedValue({ success: true } as never);

    const req = new Request("http://localhost/api/children?id=child-1", {
      method: "DELETE",
    });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    expect(deleteChild).toHaveBeenCalledWith(
      expect.anything(),
      "child-1",
      "free-user-1",
    );
  });
});

describe("Children API — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST returns 400 when service rejects the create", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(createChild).mockResolvedValue({
      success: false,
      error: "name_required",
    } as never);

    const req = new Request("http://localhost/api/children", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("name_required");
  });

  it("PATCH returns 400 when child id is missing", async () => {
    mockAuth({ id: "user-1" });
    const req = new Request("http://localhost/api/children", {
      method: "PATCH",
      body: JSON.stringify({ name: "x" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 when child id is missing", async () => {
    mockAuth({ id: "user-1" });
    const req = new Request("http://localhost/api/children", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
