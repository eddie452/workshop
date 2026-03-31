/**
 * Symptom Zones Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SymptomZones } from "@/components/checkin/symptom-zones";

describe("SymptomZones", () => {
  it("renders all 6 symptom zones", () => {
    render(<SymptomZones symptoms={{}} onChange={vi.fn()} />);
    expect(screen.getByText("Nose / Throat")).toBeDefined();
    expect(screen.getByText("Eyes")).toBeDefined();
    expect(screen.getByText("Lungs")).toBeDefined();
    expect(screen.getByText("Skin")).toBeDefined();
    expect(screen.getByText("Ear")).toBeDefined();
    expect(screen.getByText("Head / Body")).toBeDefined();
  });

  it("renders the heading", () => {
    render(<SymptomZones symptoms={{}} onChange={vi.fn()} />);
    expect(screen.getByText("Which areas are affected?")).toBeDefined();
  });

  it("expands a zone when clicked and shows symptoms", () => {
    render(<SymptomZones symptoms={{}} onChange={vi.fn()} />);
    // Click the "Eyes" zone header to expand
    fireEvent.click(screen.getByText("Eyes"));
    expect(screen.getByText("Itchy eyes")).toBeDefined();
    expect(screen.getByText("Watery eyes")).toBeDefined();
    expect(screen.getByText("Red eyes")).toBeDefined();
  });

  it("collapses a zone when clicked again", () => {
    render(<SymptomZones symptoms={{}} onChange={vi.fn()} />);
    // Expand then collapse
    fireEvent.click(screen.getByText("Eyes"));
    expect(screen.getByText("Itchy eyes")).toBeDefined();
    fireEvent.click(screen.getByText("Eyes"));
    expect(screen.queryByText("Itchy eyes")).toBeNull();
  });

  it("calls onChange when a symptom checkbox is toggled", () => {
    const onChange = vi.fn();
    render(<SymptomZones symptoms={{}} onChange={onChange} />);
    // Expand the ocular zone
    fireEvent.click(screen.getByText("Eyes"));
    // Click the "Itchy eyes" checkbox
    fireEvent.click(screen.getByTestId("symptom-sx_itchy_eyes"));
    expect(onChange).toHaveBeenCalledWith({ sx_itchy_eyes: true });
  });

  it("shows count badge when symptoms are selected", () => {
    render(
      <SymptomZones
        symptoms={{ sx_itchy_eyes: true, sx_watery_eyes: true }}
        onChange={vi.fn()}
      />,
    );
    const zone = screen.getByTestId("zone-ocular");
    expect(zone.textContent).toContain("2");
  });

  it("untoggles a previously selected symptom", () => {
    const onChange = vi.fn();
    render(
      <SymptomZones
        symptoms={{ sx_sneezing: true }}
        onChange={onChange}
      />,
    );
    // Expand the upper respiratory zone
    fireEvent.click(screen.getByText("Nose / Throat"));
    // Click sneezing to untoggle
    fireEvent.click(screen.getByTestId("symptom-sx_sneezing"));
    expect(onChange).toHaveBeenCalledWith({ sx_sneezing: false });
  });
});
