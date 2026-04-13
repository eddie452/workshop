/**
 * EditChildForm Component Tests
 *
 * Tests the inline edit form for child profiles.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditChildForm } from "@/components/children/edit-child-form";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";

const mockChild: ChildProfileSummary = {
  id: "child-1",
  name: "Alice",
  birth_year: 2020,
  created_at: "2024-01-15T00:00:00Z",
  has_pets: false,
  prior_allergy_diagnosis: false,
  known_allergens: null,
};

describe("EditChildForm", () => {
  it("pre-populates with the child's current values", () => {
    render(
      <EditChildForm
        child={mockChild}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    const nameInput = screen.getByTestId("edit-child-name-input") as HTMLInputElement;
    const yearInput = screen.getByTestId("edit-child-birth-year-input") as HTMLInputElement;

    expect(nameInput.value).toBe("Alice");
    expect(yearInput.value).toBe("2020");
  });

  it("calls onSubmit with updated values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditChildForm
        child={mockChild}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    const nameInput = screen.getByTestId("edit-child-name-input");
    fireEvent.change(nameInput, { target: { value: "Alicia" } });

    const saveBtn = screen.getByTestId("edit-child-save-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("child-1", {
        name: "Alicia",
        birth_year: 2020,
      });
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();

    render(
      <EditChildForm
        child={mockChild}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        isLoading={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByTestId("edit-child-cancel-btn"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("displays validation error when provided", () => {
    render(
      <EditChildForm
        child={mockChild}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error="Child name cannot be empty"
      />,
    );

    expect(screen.getByTestId("edit-child-error")).toBeTruthy();
    expect(screen.getByText("Child name cannot be empty")).toBeTruthy();
  });

  it("disables save button when name is empty", () => {
    render(
      <EditChildForm
        child={mockChild}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    const nameInput = screen.getByTestId("edit-child-name-input");
    fireEvent.change(nameInput, { target: { value: "" } });

    const saveBtn = screen.getByTestId("edit-child-save-btn") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("shows loading state", () => {
    render(
      <EditChildForm
        child={mockChild}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
        error={null}
      />,
    );

    expect(screen.getByText("Saving...")).toBeTruthy();
    const cancelBtn = screen.getByTestId("edit-child-cancel-btn") as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);
  });

  it("handles child with no birth year", () => {
    const childNoBirthYear: ChildProfileSummary = {
      ...mockChild,
      birth_year: null,
    };

    render(
      <EditChildForm
        child={childNoBirthYear}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    const yearInput = screen.getByTestId("edit-child-birth-year-input") as HTMLInputElement;
    expect(yearInput.value).toBe("");
  });
});
