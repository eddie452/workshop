/**
 * Step Address Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepAddress } from "@/components/onboarding/step-address";
import { INITIAL_FORM_DATA } from "@/components/onboarding/types";

describe("StepAddress", () => {
  const defaultProps = {
    formData: { ...INITIAL_FORM_DATA },
    onUpdate: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders the address input", () => {
    render(<StepAddress {...defaultProps} />);
    expect(screen.getByLabelText("Home address")).toBeDefined();
  });

  it("renders the heading", () => {
    render(<StepAddress {...defaultProps} />);
    expect(screen.getByText("Where do you live?")).toBeDefined();
  });

  it("shows error when submitting empty address", () => {
    const onNext = vi.fn();
    render(<StepAddress {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByRole("alert")).toBeDefined();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("calls onNext with valid address", () => {
    const onNext = vi.fn();
    render(
      <StepAddress
        {...defaultProps}
        formData={{ ...INITIAL_FORM_DATA, address: "123 Main St, Nashville, TN 37203" }}
        onNext={onNext}
      />,
    );
    fireEvent.click(screen.getByText("Continue"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onUpdate when address changes", () => {
    const onUpdate = vi.fn();
    render(<StepAddress {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByLabelText("Home address"), {
      target: { value: "456 Oak Ave" },
    });
    expect(onUpdate).toHaveBeenCalledWith({ address: "456 Oak Ave" });
  });

  it("rejects addresses shorter than 5 characters", () => {
    const onNext = vi.fn();
    render(
      <StepAddress
        {...defaultProps}
        formData={{ ...INITIAL_FORM_DATA, address: "hi" }}
        onNext={onNext}
      />,
    );
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByRole("alert")).toBeDefined();
    expect(onNext).not.toHaveBeenCalled();
  });
});
