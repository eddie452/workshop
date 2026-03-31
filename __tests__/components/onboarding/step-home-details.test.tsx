/**
 * Step Home Details Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepHomeDetails } from "@/components/onboarding/step-home-details";
import { INITIAL_FORM_DATA } from "@/components/onboarding/types";

describe("StepHomeDetails", () => {
  const defaultProps = {
    formData: { ...INITIAL_FORM_DATA },
    onUpdate: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders home type select", () => {
    render(<StepHomeDetails {...defaultProps} />);
    expect(screen.getByLabelText("Home type")).toBeDefined();
  });

  it("renders year built input", () => {
    render(<StepHomeDetails {...defaultProps} />);
    expect(screen.getByLabelText(/Year built/)).toBeDefined();
  });

  it("renders square footage input", () => {
    render(<StepHomeDetails {...defaultProps} />);
    expect(screen.getByLabelText(/Square footage/)).toBeDefined();
  });

  it("calls onNext when Continue is clicked", () => {
    const onNext = vi.fn();
    render(<StepHomeDetails {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<StepHomeDetails {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("allows proceeding without any details (all optional)", () => {
    const onNext = vi.fn();
    render(<StepHomeDetails {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onUpdate when home type changes", () => {
    const onUpdate = vi.fn();
    render(<StepHomeDetails {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByLabelText("Home type"), {
      target: { value: "condo" },
    });
    expect(onUpdate).toHaveBeenCalledWith({ home_type: "condo" });
  });
});
