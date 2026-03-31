/**
 * GET /api/forecast
 *
 * Environmental Forecast endpoint. Returns current pollen, AQI, and weather
 * data for the authenticated user's home location. Used when the dashboard
 * displays Environmental Forecast mode (severity = 0).
 *
 * Server-side only — API keys never exposed to client.
 * Graceful degradation: if any environmental API fails, that section
 * returns null values rather than failing the entire request.
 *
 * IMPORTANT: income_tier is NEVER included in any API response.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeatherData, WEATHER_DEFAULTS } from "@/lib/apis/weather";
import { getPollenData, POLLEN_DEFAULTS } from "@/lib/apis/pollen";
import { getAqiData, AQI_DEFAULTS } from "@/lib/apis/aqi";
import type { WeatherResult } from "@/lib/apis/weather";
import type { PollenResult } from "@/lib/apis/pollen";
import type { AqiResult } from "@/lib/apis/aqi";

/* ------------------------------------------------------------------ */
/* Response types                                                      */
/* ------------------------------------------------------------------ */

export interface ForecastSuccessResponse {
  success: true;
  pollen: PollenResult;
  weather: WeatherResult;
  aqi: AqiResult;
  region: string | null;
}

interface ForecastErrorResponse {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<
  NextResponse<ForecastSuccessResponse | ForecastErrorResponse>
> {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false as const, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Fetch user profile for location data
    type ProfileQuery = {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{
            data: {
              home_lat: number | null;
              home_lng: number | null;
              home_region: string | null;
            } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: profile } = await (
      supabase.from("user_profiles") as unknown as ProfileQuery
    )
      .select("home_lat, home_lng, home_region")
      .eq("id", user.id)
      .single();

    const lat = profile?.home_lat ?? null;
    const lng = profile?.home_lng ?? null;
    const region = profile?.home_region ?? null;

    // Fetch environmental data (graceful degradation)
    let weather: WeatherResult = WEATHER_DEFAULTS;
    let pollen: PollenResult = POLLEN_DEFAULTS;
    let aqi: AqiResult = AQI_DEFAULTS;

    if (lat !== null && lng !== null) {
      const [weatherResult, pollenResult, aqiResult] =
        await Promise.allSettled([
          getWeatherData(lat, lng),
          getPollenData(lat, lng),
          getAqiData(lat, lng),
        ]);

      weather =
        weatherResult.status === "fulfilled"
          ? weatherResult.value
          : WEATHER_DEFAULTS;
      pollen =
        pollenResult.status === "fulfilled"
          ? pollenResult.value
          : POLLEN_DEFAULTS;
      aqi =
        aqiResult.status === "fulfilled" ? aqiResult.value : AQI_DEFAULTS;
    }

    return NextResponse.json({
      success: true as const,
      pollen,
      weather,
      aqi,
      region,
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return NextResponse.json(
      {
        success: false as const,
        error: "An unexpected error occurred fetching forecast data",
      },
      { status: 500 },
    );
  }
}
