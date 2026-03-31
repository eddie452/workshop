/**
 * Severity Slider Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeveritySlider } from "@/components/checkin/severity-slider";

describe("SeveritySlider", () => {
  it("renders all 4 severity levels", () => {
    render(<SeveritySlider value={0} onChange={vi.fn()} />);
    expect(screen.getByText("None")).toBeDefined();
    expect(screen.getByText("Mild")).toBeDefined();
    expect(screen.getByText("Moderate")).toBeDefined();
    expect(screen.getByText("Severe")).toBeDefined();
  });

  it("renders the heading", () => {
    render(<SeveritySlider value={0} onChange={vi.fn()} />);
    expect(screen.getByText("How are your allergies today?")).toBeDefined();
  });

  it("marks the selected severity as checked", () => {
    render(<SeveritySlider value={2} onChange={vi.fn()} />);
    const moderateBtn = screen.getByTestId("severity-2");
    expect(moderateBtn.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange when a severity is clicked", () => {
    const onChange = vi.fn();
    render(<SeveritySlider value={0} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("severity-3"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("shows description for each level", () => {
    render(<SeveritySlider value={0} onChange={vi.fn()} />);
    expect(screen.getByText("No symptoms today")).toBeDefined();
    expect(screen.getByText("Minor, barely noticeable")).toBeDefined();
  });
});
