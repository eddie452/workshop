/**
 * OpenWeatherMap API Client
 *
 * Fetches current weather conditions: wind speed/direction, humidity,
 * temperature, and precipitation data. Used by the Monte Carlo
 * simulation for pollen dispersion modeling.
 *
 * Server-side only — API key must never be exposed to the client.
 *
 * Reference: https://openweathermap.org/current
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface WeatherResult {
  /** Temperature in Fahrenheit */
  temp_f: number | null;
  /** Relative humidity percentage (0-100) */
  humidity_pct: number | null;
  /** Wind speed in mph */
  wind_mph: number | null;
  /** Wind direction in degrees (0-360, 0=N, 90=E, 180=S, 270=W) */
  wind_direction_deg: number | null;
  /** Rain detected in last 12 hours (approximated from 1h/3h rain) */
  rain_last_12h: boolean;
  /** Thunderstorm detected in last 6 hours (from weather condition codes) */
  thunderstorm_6h: boolean;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

/** Returned when API is unreachable or key is missing */
export const WEATHER_DEFAULTS: WeatherResult = {
  temp_f: null,
  humidity_pct: null,
  wind_mph: null,
  wind_direction_deg: null,
  rain_last_12h: false,
  thunderstorm_6h: false,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Convert Kelvin to Fahrenheit */
export function kelvinToFahrenheit(kelvin: number): number {
  return Math.round(((kelvin - 273.15) * 9) / 5 + 32);
}

/** Convert m/s to mph */
export function msToMph(ms: number): number {
  return Math.round(ms * 2.237 * 10) / 10;
}

/**
 * Check if any weather condition code indicates a thunderstorm.
 * OpenWeatherMap codes 200-232 are thunderstorm conditions.
 */
export function isThunderstorm(
  weather: Array<{ id: number }> | undefined,
): boolean {
  if (!weather) return false;
  return weather.some((w) => w.id >= 200 && w.id <= 232);
}

/**
 * Check if rain is present from the rain object.
 * OpenWeatherMap provides rain.1h and rain.3h in mm.
 * We consider any rain > 0 as rain detected.
 */
function hasRain(
  rain: { "1h"?: number; "3h"?: number } | undefined,
): boolean {
  if (!rain) return false;
  return (rain["1h"] ?? 0) > 0 || (rain["3h"] ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* API Client                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch current weather data from OpenWeatherMap.
 *
 * Returns temperature, humidity, wind, and precipitation data
 * needed for Monte Carlo pollen dispersion simulation.
 *
 * @param lat — latitude
 * @param lng — longitude
 * @returns WeatherResult with current conditions, or defaults if API fails
 */
export async function getWeatherData(
  lat: number,
  lng: number,
): Promise<WeatherResult> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return WEATHER_DEFAULTS;

  try {
    const url = new URL(
      "https://api.openweathermap.org/data/2.5/weather",
    );
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lng.toString());
    url.searchParams.set("appid", apiKey);
    // Units: standard (Kelvin) — we convert manually for precision

    const response = await fetch(url.toString());
    if (!response.ok) return WEATHER_DEFAULTS;

    const data = await response.json();

    return {
      temp_f:
        typeof data.main?.temp === "number"
          ? kelvinToFahrenheit(data.main.temp)
          : null,
      humidity_pct:
        typeof data.main?.humidity === "number"
          ? data.main.humidity
          : null,
      wind_mph:
        typeof data.wind?.speed === "number"
          ? msToMph(data.wind.speed)
          : null,
      wind_direction_deg:
        typeof data.wind?.deg === "number" ? data.wind.deg : null,
      rain_last_12h: hasRain(data.rain),
      thunderstorm_6h: isThunderstorm(data.weather),
    };
  } catch {
    return WEATHER_DEFAULTS;
  }
}
