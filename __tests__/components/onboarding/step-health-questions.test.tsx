/**
 * Step Health Questions Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepHealthQuestions } from "@/components/onboarding/step-health-questions";
import { INITIAL_FORM_DATA } from "@/components/onboarding/types";

describe("StepHealthQuestions", () => {
  const defaultProps = {
    formData: { ...INITIAL_FORM_DATA },
    onUpdate: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders the heading", () => {
    render(<StepHealthQuestions {...defaultProps} />);
    expect(screen.getByText("A few quick questions")).toBeDefined();
  });

  it("renders pets question", () => {
    render(<StepHealthQuestions {...defaultProps} />);
    expect(screen.getByText("Do you have pets at home?")).toBeDefined();
  });

  it("renders prior diagnosis question", () => {
    render(<StepHealthQuestions {...defaultProps} />);
    expect(
      screen.getByText("Have you been diagnosed with allergies before?"),
    ).toBeDefined();
  });

  it("renders seasonal pattern selector", () => {
    render(<StepHealthQuestions {...defaultProps} />);
    expect(screen.getByLabelText("When are your symptoms worst?")).toBeDefined();
  });

  it("shows pet type options when has_pets is true", () => {
    render(
      <StepHealthQuestions
        {...defaultProps}
        formData={{ ...INITIAL_FORM_DATA, has_pets: true }}
      />,
    );
    expect(screen.getByText("Dog")).toBeDefined();
    expect(screen.getByText("Cat")).toBeDefined();
  });

  it("does not show pet type options when has_pets is false", () => {
    render(<StepHealthQuestions {...defaultProps} />);
    expect(screen.queryByText("Dog")).toBeNull();
  });

  it("calls onNext when Continue is clicked", () => {
    const onNext = vi.fn();
    render(<StepHealthQuestions {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<StepHealthQuestions {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders indoor risk factors", () => {
    render(<StepHealthQuestions {...defaultProps} />);
    expect(screen.getByText("Mold or moisture issues")).toBeDefined();
    expect(screen.getByText("Cockroach sightings")).toBeDefined();
    expect(screen.getByText("Smoking in the home")).toBeDefined();
  });
});
