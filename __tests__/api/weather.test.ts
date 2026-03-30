/**
 * OpenWeatherMap API Client Tests
 *
 * Validates weather data fetching, unit conversions,
 * thunderstorm detection, and graceful fallback on errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getWeatherData,
  WEATHER_DEFAULTS,
  kelvinToFahrenheit,
  msToMph,
  isThunderstorm,
} from "@/lib/apis/weather";

/* ------------------------------------------------------------------ */
/* Mock fetch                                                          */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_WEATHER_RESPONSE = {
  main: {
    temp: 295.15, // 71.6°F → rounds to 72°F
    humidity: 65,
  },
  wind: {
    speed: 4.47, // ~10.0 mph
    deg: 180,
  },
  weather: [{ id: 500, main: "Rain", description: "light rain" }],
  rain: { "1h": 0.5 },
};

const THUNDERSTORM_RESPONSE = {
  ...MOCK_WEATHER_RESPONSE,
  weather: [{ id: 211, main: "Thunderstorm", description: "thunderstorm" }],
};

/* ------------------------------------------------------------------ */
/* Unit conversion tests                                               */
/* ------------------------------------------------------------------ */

describe("kelvinToFahrenheit", () => {
  it("converts 273.15 K to 32°F (freezing point)", () => {
    expect(kelvinToFahrenheit(273.15)).toBe(32);
  });

  it("converts 373.15 K to 212°F (boiling point)", () => {
    expect(kelvinToFahrenheit(373.15)).toBe(212);
  });

  it("converts 295.15 K to 72°F (room temp)", () => {
    expect(kelvinToFahrenheit(295.15)).toBe(72);
  });
});

describe("msToMph", () => {
  it("converts 1 m/s to ~2.2 mph", () => {
    expect(msToMph(1)).toBe(2.2);
  });

  it("converts 0 m/s to 0 mph", () => {
    expect(msToMph(0)).toBe(0);
  });

  it("converts 10 m/s to ~22.4 mph", () => {
    expect(msToMph(10)).toBe(22.4);
  });
});

describe("isThunderstorm", () => {
  it("returns true for thunderstorm codes (200-232)", () => {
    expect(isThunderstorm([{ id: 200 }])).toBe(true);
    expect(isThunderstorm([{ id: 211 }])).toBe(true);
    expect(isThunderstorm([{ id: 232 }])).toBe(true);
  });

  it("returns false for non-thunderstorm codes", () => {
    expect(isThunderstorm([{ id: 500 }])).toBe(false);
    expect(isThunderstorm([{ id: 800 }])).toBe(false);
    expect(isThunderstorm([{ id: 199 }])).toBe(false);
    expect(isThunderstorm([{ id: 233 }])).toBe(false);
  });

  it("returns false for undefined weather array", () => {
    expect(isThunderstorm(undefined)).toBe(false);
  });

  it("detects thunderstorm in mixed conditions", () => {
    expect(isThunderstorm([{ id: 500 }, { id: 210 }])).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* API client tests                                                    */
/* ------------------------------------------------------------------ */

describe("getWeatherData", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENWEATHER_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("successful API response", () => {
    it("returns converted weather data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_WEATHER_RESPONSE),
      });

      const result = await getWeatherData(36.1627, -86.7816);

      expect(result.temp_f).toBe(72);
      expect(result.humidity_pct).toBe(65);
      expect(result.wind_mph).toBe(10);
      expect(result.wind_direction_deg).toBe(180);
      expect(result.rain_last_12h).toBe(true);
      expect(result.thunderstorm_6h).toBe(false);
    });

    it("detects thunderstorm conditions", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(THUNDERSTORM_RESPONSE),
      });

      const result = await getWeatherData(36.1627, -86.7816);
      expect(result.thunderstorm_6h).toBe(true);
    });

    it("detects no rain when rain object is missing", async () => {
      const noRain = { ...MOCK_WEATHER_RESPONSE, rain: undefined };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(noRain),
      });

      const result = await getWeatherData(36.1627, -86.7816);
      expect(result.rain_last_12h).toBe(false);
    });

    it("passes correct parameters to the API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_WEATHER_RESPONSE),
      });

      await getWeatherData(36.1627, -86.7816);

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        "https://api.openweathermap.org/data/2.5/weather",
      );
      expect(calledUrl.searchParams.get("lat")).toBe("36.1627");
      expect(calledUrl.searchParams.get("lon")).toBe("-86.7816");
      expect(calledUrl.searchParams.get("appid")).toBe("test-key");
    });
  });

  describe("missing data handling", () => {
    it("returns null fields when main/wind objects are missing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ weather: [] }),
      });

      const result = await getWeatherData(36.1627, -86.7816);
      expect(result.temp_f).toBeNull();
      expect(result.humidity_pct).toBeNull();
      expect(result.wind_mph).toBeNull();
      expect(result.wind_direction_deg).toBeNull();
    });
  });

  describe("error handling", () => {
    it("returns defaults when API key is missing", async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const result = await getWeatherData(36.1627, -86.7816);
      expect(result).toEqual(WEATHER_DEFAULTS);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns defaults when API returns non-OK status", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      const result = await getWeatherData(36.1627, -86.7816);
      expect(result).toEqual(WEATHER_DEFAULTS);
    });

    it("returns defaults when fetch throws network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const result = await getWeatherData(36.1627, -86.7816);
      expect(result).toEqual(WEATHER_DEFAULTS);
    });
  });
});
