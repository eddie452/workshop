/**
 * Environmental Forecast Tests
 *
 * Validates the display when severity = 0 (no symptoms).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvironmentalForecast } from "@/components/leaderboard/environmental-forecast";

describe("EnvironmentalForecast", () => {
  it("renders the component", () => {
    render(<EnvironmentalForecast />);
    expect(screen.getByTestId("environmental-forecast")).toBeDefined();
  });

  it("displays the mode title", () => {
    render(<EnvironmentalForecast />);
    expect(screen.getByText("Environmental Forecast Mode")).toBeDefined();
  });

  it("shows a message about no symptoms", () => {
    render(<EnvironmentalForecast />);
    expect(
      screen.getByText(/No symptoms reported/)
    ).toBeDefined();
  });
});
