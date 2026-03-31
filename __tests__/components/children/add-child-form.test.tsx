/**
 * AddChildForm Component Tests
 *
 * Tests the form for creating new child profiles.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddChildForm } from "@/components/children/add-child-form";

describe("AddChildForm", () => {
  it("renders the form with name and birth year fields", () => {
    render(
      <AddChildForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId("add-child-form")).toBeTruthy();
    expect(screen.getByTestId("child-name-input")).toBeTruthy();
    expect(screen.getByTestId("child-birth-year-input")).toBeTruthy();
  });

  it("save button is disabled when name is empty", () => {
    render(
      <AddChildForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    const saveBtn = screen.getByTestId("save-child-btn");
    expect(saveBtn.hasAttribute("disabled")).toBe(true);
  });

  it("save button is enabled when name is entered", () => {
    render(
      <AddChildForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    fireEvent.change(screen.getByTestId("child-name-input"), {
      target: { value: "Alice" },
    });

    const saveBtn = screen.getByTestId("save-child-btn");
    expect(saveBtn.hasAttribute("disabled")).toBe(false);
  });

  it("shows error message when error prop is set", () => {
    render(
      <AddChildForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error="Maximum of 5 child profiles allowed"
      />,
    );

    expect(screen.getByTestId("add-child-error")).toBeTruthy();
    expect(
      screen.getByText("Maximum of 5 child profiles allowed"),
    ).toBeTruthy();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <AddChildForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
        isLoading={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows loading state", () => {
    render(
      <AddChildForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
        error={null}
      />,
    );

    expect(screen.getByText("Saving...")).toBeTruthy();
  });
});
