/**
 * Step Confirmation Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepConfirmation } from "@/components/onboarding/step-confirmation";
import { INITIAL_FORM_DATA } from "@/components/onboarding/types";

describe("StepConfirmation", () => {
  const filledData = {
    ...INITIAL_FORM_DATA,
    address: "123 Main St, Nashville, TN 37203",
    home_type: "single_family" as const,
    year_built: 1985,
    has_pets: true,
    pet_types: ["Dog", "Cat"],
    prior_allergy_diagnosis: true,
    seasonal_pattern: "spring" as const,
    has_mold_moisture: true,
  };

  const defaultProps = {
    formData: filledData,
    onUpdate: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders the heading", () => {
    render(<StepConfirmation {...defaultProps} />);
    expect(screen.getByText("Confirm your information")).toBeDefined();
  });

  it("displays the address", () => {
    render(<StepConfirmation {...defaultProps} />);
    expect(
      screen.getByText("123 Main St, Nashville, TN 37203"),
    ).toBeDefined();
  });

  it("displays home type label", () => {
    render(<StepConfirmation {...defaultProps} />);
    expect(screen.getByText("Single Family Home")).toBeDefined();
  });

  it("displays year built", () => {
    render(<StepConfirmation {...defaultProps} />);
    expect(screen.getByText("1985")).toBeDefined();
  });

  it("displays pets with types", () => {
    render(<StepConfirmation {...defaultProps} />);
    expect(screen.getByText("Dog, Cat")).toBeDefined();
  });

  it("displays prior diagnosis", () => {
    render(<StepConfirmation {...defaultProps} />);
    // Find "Yes" text in the context of prior diagnosis
    const yesElements = screen.getAllByText("Yes");
    expect(yesElements.length).toBeGreaterThan(0);
  });

  it("displays seasonal pattern", () => {
    render(<StepConfirmation {...defaultProps} />);
    expect(screen.getByText("Spring")).toBeDefined();
  });

  it('calls onNext when "Build My Prediction" is clicked', () => {
    const onNext = vi.fn();
    render(<StepConfirmation {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Build My Prediction"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<StepConfirmation {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows 'No' for pets when has_pets is false", () => {
    render(
      <StepConfirmation
        {...defaultProps}
        formData={{ ...INITIAL_FORM_DATA, address: "123 Main St" }}
      />,
    );
    // "No" should appear for pets and prior diagnosis
    const noElements = screen.getAllByText("No");
    expect(noElements.length).toBeGreaterThanOrEqual(2);
  });
});
