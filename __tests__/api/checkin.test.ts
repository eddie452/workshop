/**
 * Check-in API Route Tests
 *
 * Tests the POST /api/checkin endpoint logic.
 * Key assertions:
 * - income_tier NEVER present in any response
 * - Environmental data fetched server-side
 * - Tournament engine called after check-in save
 * - Duplicate daily check-in prevented
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/apis/weather", () => ({
  getWeatherData: vi.fn(),
  WEATHER_DEFAULTS: {
    temp_f: null,
    humidity_pct: null,
    wind_mph: null,
    wind_direction_deg: null,
    rain_last_12h: false,
    thunderstorm_6h: false,
  },
}));

vi.mock("@/lib/apis/pollen", () => ({
  getPollenData: vi.fn(),
  POLLEN_DEFAULTS: {
    upi_tree: null,
    upi_grass: null,
    upi_weed: null,
    species: [],
    date: null,
  },
}));

vi.mock("@/lib/apis/aqi", () => ({
  getAqiData: vi.fn(),
  AQI_DEFAULTS: {
    aqi: null,
    pm25: null,
    pm10: null,
    dominant_pollutant: null,
    station: null,
  },
}));

vi.mock("@/lib/engine/run", () => ({
  runTournamentPipeline: vi.fn().mockReturnValue({
    symptom_gate_passed: true,
    tournament: {
      leaderboard: [],
      final_four: [
        { allergen_id: "a1", common_name: "Oak", category: "tree", composite_score: 1500, tier: "high" },
        { allergen_id: "a2", common_name: "Ragweed", category: "weed", composite_score: 1400, tier: "high" },
      ],
      trigger_champion: {
        allergen_id: "a1",
        common_name: "Oak",
        category: "tree",
        composite_score: 1500,
        tier: "high",
      },
    },
    elo_updates: [],
    step_trace: [],
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { getWeatherData } from "@/lib/apis/weather";
import { getPollenData } from "@/lib/apis/pollen";
import { getAqiData } from "@/lib/apis/aqi";
import { runTournamentPipeline } from "@/lib/engine/run";

// Import after mocks
import { POST } from "@/app/api/checkin/route";

/* ------------------------------------------------------------------ */
/* Mock helpers                                                        */
/* ------------------------------------------------------------------ */

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "checkin-123" },
        error: null,
      }),
    }),
  });

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  });

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          home_lat: 36.16,
          home_lng: -86.78,
          home_region: "Southeast",
          ccrs: 42,
          cockroach_sighting: false,
        },
        error: null,
      }),
      is: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      }),
    }),
  });

  const mockEloSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({
        data: [
          { allergen_id: "a1", elo_score: 1200, positive_signals: 3, negative_signals: 1 },
        ],
        error: null,
      }),
    }),
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "symptom_checkins") {
        return {
          insert: mockInsert,
          update: mockUpdate,
          select: mockSelect,
        };
      }
      if (table === "user_profiles") {
        return { select: mockSelect };
      }
      if (table === "user_allergen_elo") {
        return { select: mockEloSelect, update: mockUpdate };
      }
      return {
        insert: mockInsert,
        update: mockUpdate,
        select: mockSelect,
        ...overrides,
      };
    }),
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
  };
}

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("POST /api/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(getWeatherData).mockResolvedValue({
      temp_f: 72,
      humidity_pct: 55,
      wind_mph: 8,
      wind_direction_deg: 180,
      rain_last_12h: false,
      thunderstorm_6h: false,
    });

    vi.mocked(getPollenData).mockResolvedValue({
      upi_tree: 3,
      upi_grass: 2,
      upi_weed: 1,
      species: [],
      date: "2026-03-30",
    });

    vi.mocked(getAqiData).mockResolvedValue({
      aqi: 42,
      pm25: 12,
      pm10: 25,
      dominant_pollutant: "pm25",
      station: "Nashville",
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({ severity: 0, symptoms: {}, symptom_peak_time: "all_day", mostly_indoors: false }),
    );
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid severity", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({ severity: 5, symptoms: {}, symptom_peak_time: "all_day", mostly_indoors: false }),
    );
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Severity must be 0-3");
  });

  it("returns 409 when already checked in today", async () => {
    const mockSupabase = createMockSupabase();

    // Override the count query to return 1 (already checked in)
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "symptom_checkins") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({ count: 1, error: null }),
                }),
              }),
            }),
          }),
          insert: vi.fn(),
          update: vi.fn(),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({ severity: 1, symptoms: {}, symptom_peak_time: "all_day", mostly_indoors: false }),
    );
    expect(response.status).toBe(409);

    const data = await response.json();
    expect(data.error).toBe("Already checked in today");
  });

  it("saves check-in with severity=0 (symptom-free day)", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({
        severity: 0,
        symptoms: {},
        symptom_peak_time: "all_day",
        mostly_indoors: false,
      }),
    );

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.checkin_id).toBe("checkin-123");
  });

  it("saves check-in with symptoms and returns tournament results", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({
        severity: 2,
        symptoms: {
          sx_sneezing: true,
          sx_itchy_eyes: true,
          sx_runny_nose: true,
        },
        symptom_peak_time: "morning",
        mostly_indoors: false,
      }),
    );

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.checkin_id).toBe("checkin-123");
    expect(data.trigger_champion).toBe("a1");
    expect(data.final_four).toEqual(["a1", "a2"]);
  });

  it("fetches environmental data server-side", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await POST(
      makeRequest({
        severity: 1,
        symptoms: {},
        symptom_peak_time: "all_day",
        mostly_indoors: false,
      }),
    );

    expect(getWeatherData).toHaveBeenCalledWith(36.16, -86.78);
    expect(getPollenData).toHaveBeenCalledWith(36.16, -86.78);
    expect(getAqiData).toHaveBeenCalledWith(36.16, -86.78);
  });

  it("NEVER includes income_tier in response", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({
        severity: 2,
        symptoms: { sx_sneezing: true },
        symptom_peak_time: "morning",
        mostly_indoors: false,
      }),
    );

    const data = await response.json();
    const responseText = JSON.stringify(data);
    expect(responseText).not.toContain("income_tier");
  });

  it("succeeds even when environmental APIs fail", async () => {
    vi.mocked(getWeatherData).mockRejectedValue(new Error("API down"));
    vi.mocked(getPollenData).mockRejectedValue(new Error("API down"));
    vi.mocked(getAqiData).mockRejectedValue(new Error("API down"));

    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({
        severity: 1,
        symptoms: { sx_sneezing: true },
        symptom_peak_time: "all_day",
        mostly_indoors: false,
      }),
    );

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.checkin_id).toBe("checkin-123");
  });

  it("increments negative_signals (not positive_signals) when Elo delta is negative", async () => {
    // Override runTournamentPipeline to return a negative delta
    vi.mocked(runTournamentPipeline).mockReturnValueOnce({
      symptom_gate_passed: true,
      tournament: {
        leaderboard: [],
        final_four: [],
        trigger_champion: null,
      },
      elo_updates: [
        { allergen_id: "a1", new_elo: 1180, delta: -20, k_factor: 32 },
      ],
      step_trace: [],
    } as never);

    const mockSupabase = createMockSupabase();

    // Track the update calls to user_allergen_elo
    const eloUpdateData: Record<string, unknown>[] = [];
    const mockEloUpdate = vi.fn((data: Record<string, unknown>) => {
      eloUpdateData.push(data);
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    });

    const originalFrom = mockSupabase.from;
    mockSupabase.from = vi.fn((table: string) => {
      const result = originalFrom(table);
      if (table === "user_allergen_elo") {
        return { ...result, update: mockEloUpdate };
      }
      return result;
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(
      makeRequest({
        severity: 2,
        symptoms: { sx_sneezing: true },
        symptom_peak_time: "morning",
        mostly_indoors: false,
      }),
    );

    const data = await response.json();
    expect(data.success).toBe(true);

    // The Elo update should have been called
    expect(mockEloUpdate).toHaveBeenCalled();

    // Verify negative delta incremented negative_signals, not positive_signals
    const updatePayload = eloUpdateData[0];
    expect(updatePayload).toBeDefined();
    expect(updatePayload.elo_score).toBe(1180);
    // existing row has positive_signals: 3, negative_signals: 1
    expect(updatePayload.positive_signals).toBe(3); // unchanged
    expect(updatePayload.negative_signals).toBe(2); // incremented from 1 to 2
  });
});
