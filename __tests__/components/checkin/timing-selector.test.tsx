/**
 * Timing Selector Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimingSelector } from "@/components/checkin/timing-selector";

describe("TimingSelector", () => {
  const defaultProps = {
    peakTime: "all_day" as const,
    mostlyIndoors: false,
    onPeakTimeChange: vi.fn(),
    onIndoorsChange: vi.fn(),
  };

  it("renders all 4 timing options", () => {
    render(<TimingSelector {...defaultProps} />);
    expect(screen.getByText("Morning")).toBeDefined();
    expect(screen.getByText("Midday")).toBeDefined();
    expect(screen.getByText("Evening")).toBeDefined();
    expect(screen.getByText("All day")).toBeDefined();
  });

  it("renders indoor/outdoor options", () => {
    render(<TimingSelector {...defaultProps} />);
    expect(screen.getByText("Mostly indoors")).toBeDefined();
    expect(screen.getByText("Mostly outdoors")).toBeDefined();
  });

  it("marks selected timing as checked", () => {
    render(<TimingSelector {...defaultProps} peakTime="morning" />);
    expect(
      screen.getByTestId("timing-morning").getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByTestId("timing-all_day").getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("calls onPeakTimeChange when timing is clicked", () => {
    const onPeakTimeChange = vi.fn();
    render(
      <TimingSelector {...defaultProps} onPeakTimeChange={onPeakTimeChange} />,
    );
    fireEvent.click(screen.getByTestId("timing-evening"));
    expect(onPeakTimeChange).toHaveBeenCalledWith("evening");
  });

  it("calls onIndoorsChange when indoor/outdoor is clicked", () => {
    const onIndoorsChange = vi.fn();
    render(
      <TimingSelector {...defaultProps} onIndoorsChange={onIndoorsChange} />,
    );
    fireEvent.click(screen.getByTestId("indoors-true"));
    expect(onIndoorsChange).toHaveBeenCalledWith(true);
  });

  it("marks mostly indoors as checked when selected", () => {
    render(<TimingSelector {...defaultProps} mostlyIndoors={true} />);
    expect(
      screen.getByTestId("indoors-true").getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByTestId("indoors-false").getAttribute("aria-checked"),
    ).toBe("false");
  });
});
