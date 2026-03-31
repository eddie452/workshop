/**
 * Forecast API Route Tests
 *
 * Tests the GET /api/forecast endpoint logic.
 * Key assertions:
 * - Authentication required
 * - Environmental data fetched server-side from user's location
 * - Graceful degradation when APIs fail
 * - income_tier NEVER present in any response
 * - Returns pollen, weather, AQI, and region data
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

import { createClient } from "@/lib/supabase/server";
import { getWeatherData } from "@/lib/apis/weather";
import { getPollenData } from "@/lib/apis/pollen";
import { getAqiData } from "@/lib/apis/aqi";
import { GET } from "@/app/api/forecast/route";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function createMockSupabase({
  user = { id: "user-123" },
  profile = { home_lat: 33.749, home_lng: -84.388, home_region: "Southeast" },
}: {
  user?: { id: string } | null;
  profile?: { home_lat: number | null; home_lng: number | null; home_region: string | null } | null;
} = {}) {
  const mockSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
    from: mockFrom,
  };
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("GET /api/forecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const mockSupabase = createMockSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns environmental data for authenticated user with location", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(getWeatherData).mockResolvedValue({
      temp_f: 72,
      humidity_pct: 55,
      wind_mph: 8.5,
      wind_direction_deg: 180,
      rain_last_12h: false,
      thunderstorm_6h: false,
    });

    vi.mocked(getPollenData).mockResolvedValue({
      upi_tree: 3,
      upi_grass: 1,
      upi_weed: 0,
      species: [],
      date: "2026-03-30",
    });

    vi.mocked(getAqiData).mockResolvedValue({
      aqi: 42,
      pm25: 12,
      pm10: 18,
      dominant_pollutant: "pm25",
      station: "Downtown Monitor",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pollen.upi_tree).toBe(3);
    expect(data.weather.temp_f).toBe(72);
    expect(data.aqi.aqi).toBe(42);
    expect(data.region).toBe("Southeast");
  });

  it("calls environmental APIs with user location", async () => {
    const mockSupabase = createMockSupabase({
      profile: { home_lat: 40.7128, home_lng: -74.006, home_region: "Northeast" },
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(getWeatherData).mockResolvedValue({
      temp_f: 65,
      humidity_pct: 60,
      wind_mph: 12,
      wind_direction_deg: 270,
      rain_last_12h: true,
      thunderstorm_6h: false,
    });
    vi.mocked(getPollenData).mockResolvedValue({
      upi_tree: 2,
      upi_grass: 0,
      upi_weed: 1,
      species: [],
      date: "2026-03-30",
    });
    vi.mocked(getAqiData).mockResolvedValue({
      aqi: 55,
      pm25: 15,
      pm10: 22,
      dominant_pollutant: "pm25",
      station: "Midtown",
    });

    await GET();

    expect(getWeatherData).toHaveBeenCalledWith(40.7128, -74.006);
    expect(getPollenData).toHaveBeenCalledWith(40.7128, -74.006);
    expect(getAqiData).toHaveBeenCalledWith(40.7128, -74.006);
  });

  it("returns defaults when user has no location", async () => {
    const mockSupabase = createMockSupabase({
      profile: { home_lat: null, home_lng: null, home_region: null },
    });
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pollen.upi_tree).toBeNull();
    expect(data.weather.temp_f).toBeNull();
    expect(data.aqi.aqi).toBeNull();
    expect(data.region).toBeNull();

    // APIs should NOT be called when there's no location
    expect(getWeatherData).not.toHaveBeenCalled();
    expect(getPollenData).not.toHaveBeenCalled();
    expect(getAqiData).not.toHaveBeenCalled();
  });

  it("gracefully degrades when weather API fails", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(getWeatherData).mockRejectedValue(new Error("API down"));
    vi.mocked(getPollenData).mockResolvedValue({
      upi_tree: 3,
      upi_grass: 1,
      upi_weed: 0,
      species: [],
      date: "2026-03-30",
    });
    vi.mocked(getAqiData).mockResolvedValue({
      aqi: 42,
      pm25: 12,
      pm10: 18,
      dominant_pollutant: "pm25",
      station: "Downtown",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Weather should fall back to defaults
    expect(data.weather.temp_f).toBeNull();
    // Other APIs should still work
    expect(data.pollen.upi_tree).toBe(3);
    expect(data.aqi.aqi).toBe(42);
  });

  it("never includes income_tier in response", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    vi.mocked(getWeatherData).mockResolvedValue({
      temp_f: 72,
      humidity_pct: 55,
      wind_mph: 8.5,
      wind_direction_deg: 180,
      rain_last_12h: false,
      thunderstorm_6h: false,
    });
    vi.mocked(getPollenData).mockResolvedValue({
      upi_tree: 3,
      upi_grass: 1,
      upi_weed: 0,
      species: [],
      date: "2026-03-30",
    });
    vi.mocked(getAqiData).mockResolvedValue({
      aqi: 42,
      pm25: 12,
      pm10: 18,
      dominant_pollutant: "pm25",
      station: "Downtown",
    });

    const response = await GET();
    const text = await response.text();

    expect(text).not.toContain("income_tier");
  });
});
