/**
 * Onboarding API Route Tests
 *
 * Tests the POST /api/onboarding endpoint logic.
 * Key assertion: income_tier is NEVER present in any API response body.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/apis/geocoding", () => ({
  geocodeAddress: vi.fn(),
}));

vi.mock("@/lib/apis/batchdata", () => ({
  getPropertyData: vi.fn(),
}));

vi.mock("@/lib/apis/census", () => ({
  getBlockGroupIncome: vi.fn(),
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/apis/geocoding";
import { getPropertyData } from "@/lib/apis/batchdata";
import { getBlockGroupIncome } from "@/lib/apis/census";

// Import after mocks
import { POST } from "@/app/api/onboarding/route";

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockUpsert = vi.fn().mockReturnValue({ error: null });
  const mockInsert = vi.fn().mockReturnValue({ error: null });
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({ error: null }),
    }),
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: mockUpsert,
      insert: mockInsert,
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({ error: null }),
        }),
      }),
      ...overrides,
    }),
    _mockUpsert: mockUpsert,
    _mockInsert: mockInsert,
    _mockDelete: mockDelete,
  };
}

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ address: "123 Main St" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when address is missing", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("income_tier is NOT present in any API response body", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(geocodeAddress).mockResolvedValue({
      lat: 36.16,
      lng: -86.78,
      formatted_address: "123 Main St, Nashville, TN 37203",
      state: "TN",
      zip: "37203",
      is_continental_us: true,
    });

    vi.mocked(getPropertyData).mockResolvedValue({
      year_built: 1965,
      home_type: "single_family",
      sqft: 1850,
      source: "fixture",
    });

    vi.mocked(getBlockGroupIncome).mockResolvedValue({
      income_tier: 3,
      median_income: 65000,
      fips: { state: "47", county: "037", tract: "012345", block_group: "1" },
    });

    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({
        address: "123 Main St, Nashville, TN 37203",
        has_pets: false,
        prior_allergy_diagnosis: false,
        seasonal_pattern: "unknown",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    // CRITICAL: income_tier must NEVER appear in response
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("income_tier");
    expect(bodyStr).not.toContain("median_income");
  });

  it("succeeds with valid data and geocoding", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(geocodeAddress).mockResolvedValue({
      lat: 36.16,
      lng: -86.78,
      formatted_address: "123 Main St, Nashville, TN 37203",
      state: "TN",
      zip: "37203",
      is_continental_us: true,
    });

    vi.mocked(getPropertyData).mockResolvedValue(null);
    vi.mocked(getBlockGroupIncome).mockResolvedValue(null);

    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({
        address: "123 Main St, Nashville, TN 37203",
        has_pets: true,
        pet_types: ["Dog"],
        prior_allergy_diagnosis: false,
        seasonal_pattern: "spring",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.profile.home_state).toBe("TN");
    expect(body.profile.home_region).toBe("Southeast");
    expect(body.allergen_count).toBeGreaterThan(0);
  });

  it("succeeds even when geocoding fails (graceful degradation)", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(geocodeAddress).mockRejectedValue(new Error("API key missing"));
    vi.mocked(getPropertyData).mockResolvedValue(null);

    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({
        address: "123 Main St, Nashville, TN 37203",
        has_pets: false,
        prior_allergy_diagnosis: false,
        seasonal_pattern: "unknown",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    // lat/lng will be null because geocoding failed
    expect(body.profile.home_lat).toBeNull();
    expect(body.profile.home_lng).toBeNull();
  });

  it("succeeds when BatchData fails (graceful degradation)", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(geocodeAddress).mockResolvedValue({
      lat: 36.16,
      lng: -86.78,
      formatted_address: "123 Main St, Nashville, TN 37203",
      state: "TN",
      zip: "37203",
      is_continental_us: true,
    });

    vi.mocked(getPropertyData).mockRejectedValue(new Error("BatchData down"));
    vi.mocked(getBlockGroupIncome).mockResolvedValue(null);

    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({
        address: "123 Main St, Nashville, TN 37203",
        has_pets: false,
        prior_allergy_diagnosis: false,
        seasonal_pattern: "unknown",
        manual_home_type: "single_family",
        manual_year_built: 1985,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
