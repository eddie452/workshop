/**
 * Environmental Forecast Tests
 *
 * Validates the Environmental Forecast display:
 * - Loading state
 * - No data state
 * - Full data rendering (pollen, AQI, weather)
 * - Good news messaging
 * - FDA disclaimer present
 * - Graceful handling of partial data
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvironmentalForecast } from "@/components/leaderboard/environmental-forecast";
import type { ForecastData } from "@/components/leaderboard/environmental-forecast";

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const fullForecastData: ForecastData = {
  pollen: {
    upi_tree: 3,
    upi_grass: 1,
    upi_weed: 0,
    species: [
      { display_name: "Oak", index: { value: 3, category: "Moderate" } },
      { display_name: "Birch", index: { value: 2, category: "Low" } },
    ],
    date: "2026-03-30",
  },
  weather: {
    temp_f: 72,
    humidity_pct: 55,
    wind_mph: 8.5,
    wind_direction_deg: 180,
    rain_last_12h: false,
    thunderstorm_6h: false,
  },
  aqi: {
    aqi: 42,
    pm25: 12,
    pm10: 18,
    dominant_pollutant: "pm25",
    station: "Downtown Monitor",
  },
  region: "Southeast",
};

const emptyForecastData: ForecastData = {
  pollen: {
    upi_tree: null,
    upi_grass: null,
    upi_weed: null,
    species: [],
    date: null,
  },
  weather: {
    temp_f: null,
    humidity_pct: null,
    wind_mph: null,
    wind_direction_deg: null,
    rain_last_12h: false,
    thunderstorm_6h: false,
  },
  aqi: {
    aqi: null,
    pm25: null,
    pm10: null,
    dominant_pollutant: null,
    station: null,
  },
  region: null,
};

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("EnvironmentalForecast", () => {
  it("renders the component", () => {
    render(<EnvironmentalForecast />);
    expect(screen.getByTestId("environmental-forecast")).toBeDefined();
  });

  it("displays good news messaging when no symptoms", () => {
    render(<EnvironmentalForecast data={fullForecastData} />);
    expect(screen.getByText("No Symptoms Today")).toBeDefined();
  });

  it("shows FDA disclaimer", () => {
    render(<EnvironmentalForecast data={fullForecastData} />);
    expect(screen.getByTestId("fda-disclaimer")).toBeDefined();
  });

  describe("loading state", () => {
    it("shows loading skeleton when loading", () => {
      render(<EnvironmentalForecast loading={true} />);
      expect(screen.getByTestId("forecast-loading")).toBeDefined();
    });
  });

  describe("no data state", () => {
    it("shows no-data message when data is null", () => {
      render(<EnvironmentalForecast data={null} />);
      expect(screen.getByTestId("forecast-no-data")).toBeDefined();
    });

    it("shows no-data message when all values are null", () => {
      render(<EnvironmentalForecast data={emptyForecastData} />);
      expect(screen.getByTestId("forecast-no-data")).toBeDefined();
    });
  });

  describe("full data rendering", () => {
    it("renders pollen levels", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.getByText("Pollen Levels")).toBeDefined();
      expect(screen.getByText("Tree Pollen")).toBeDefined();
      expect(screen.getByText("Grass Pollen")).toBeDefined();
      expect(screen.getByText("Weed Pollen")).toBeDefined();
    });

    it("renders pollen level labels correctly", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      // UPI 3 = "Moderate" (appears for tree pollen + Oak species), UPI 1 = "Very Low", UPI 0 = "None"
      expect(screen.getAllByText("Moderate").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Very Low")).toBeDefined();
      expect(screen.getByText("None")).toBeDefined();
    });

    it("renders active pollen species", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.getByText("Active Species")).toBeDefined();
      expect(screen.getByText("Oak")).toBeDefined();
      expect(screen.getByText("Birch")).toBeDefined();
    });

    it("renders AQI data", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.getByText("Air Quality")).toBeDefined();
      expect(screen.getByText("42")).toBeDefined();
      expect(screen.getByText("Good")).toBeDefined();
    });

    it("renders PM2.5 and PM10 values", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.getByText("PM2.5")).toBeDefined();
      expect(screen.getByText("12 ug/m3")).toBeDefined();
      expect(screen.getByText("PM10")).toBeDefined();
      expect(screen.getByText("18 ug/m3")).toBeDefined();
    });

    it("renders weather data", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.getByText("Weather Conditions")).toBeDefined();
      expect(screen.getByText("72\u00B0F")).toBeDefined();
      expect(screen.getByText("55%")).toBeDefined();
      expect(screen.getByText("8.5 mph S")).toBeDefined();
    });

    it("renders region label", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.getByTestId("forecast-region")).toBeDefined();
      expect(screen.getByText(/Southeast/)).toBeDefined();
    });

    it("does not show allergen rankings", () => {
      render(<EnvironmentalForecast data={fullForecastData} />);
      expect(screen.queryByTestId("trigger-champion-card")).toBeNull();
      expect(screen.queryByTestId("final-four-card")).toBeNull();
      expect(screen.queryByTestId("ranked-allergen-row")).toBeNull();
    });
  });

  describe("partial data", () => {
    it("handles missing AQI gracefully", () => {
      const partialData: ForecastData = {
        ...fullForecastData,
        aqi: {
          aqi: null,
          pm25: null,
          pm10: null,
          dominant_pollutant: null,
          station: null,
        },
      };
      render(<EnvironmentalForecast data={partialData} />);
      expect(
        screen.getByText("AQI data unavailable for your location.")
      ).toBeDefined();
    });

    it("handles missing weather gracefully", () => {
      const partialData: ForecastData = {
        ...fullForecastData,
        weather: {
          temp_f: null,
          humidity_pct: null,
          wind_mph: null,
          wind_direction_deg: null,
          rain_last_12h: false,
          thunderstorm_6h: false,
        },
      };
      render(<EnvironmentalForecast data={partialData} />);
      expect(
        screen.getByText("Weather data unavailable for your location.")
      ).toBeDefined();
    });

    it("shows rain detected when raining", () => {
      const rainyData: ForecastData = {
        ...fullForecastData,
        weather: {
          ...fullForecastData.weather,
          rain_last_12h: true,
        },
      };
      render(<EnvironmentalForecast data={rainyData} />);
      expect(screen.getByText("Rain detected")).toBeDefined();
    });

    it("shows thunderstorm activity", () => {
      const stormyData: ForecastData = {
        ...fullForecastData,
        weather: {
          ...fullForecastData.weather,
          thunderstorm_6h: true,
        },
      };
      render(<EnvironmentalForecast data={stormyData} />);
      expect(screen.getByText("Thunderstorm nearby")).toBeDefined();
    });
  });
});
