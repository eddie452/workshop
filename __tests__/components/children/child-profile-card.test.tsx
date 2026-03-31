/**
 * ChildProfileCard Component Tests
 *
 * Tests the child profile display card with actions.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChildProfileCard } from "@/components/children/child-profile-card";
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

describe("ChildProfileCard", () => {
  it("renders child name and age", () => {
    render(
      <ChildProfileCard
        child={mockChild}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("Alice")).toBeTruthy();
    // Age is calculated from current year - birth_year
    const currentYear = new Date().getFullYear();
    const expectedAge = currentYear - 2020;
    expect(screen.getByText(`Age ${expectedAge}`)).toBeTruthy();
  });

  it("renders initial letter avatar", () => {
    render(
      <ChildProfileCard
        child={mockChild}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("A")).toBeTruthy();
  });

  it("does not show age when birth_year is null", () => {
    const childNoAge: ChildProfileSummary = {
      ...mockChild,
      birth_year: null,
    };

    render(
      <ChildProfileCard
        child={childNoAge}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Age/)).toBeNull();
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn();
    render(
      <ChildProfileCard
        child={mockChild}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByTestId("edit-child-btn"));
    expect(onEdit).toHaveBeenCalledWith("child-1");
  });

  it("shows confirmation before delete", () => {
    const onDelete = vi.fn();
    render(
      <ChildProfileCard
        child={mockChild}
        onDelete={onDelete}
        onEdit={vi.fn()}
      />,
    );

    // First click shows confirmation
    fireEvent.click(screen.getByTestId("delete-child-btn"));
    expect(screen.getByTestId("confirm-delete-btn")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    // Confirm delete
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));
    expect(onDelete).toHaveBeenCalledWith("child-1");
  });

  it("cancel delete hides confirmation", () => {
    render(
      <ChildProfileCard
        child={mockChild}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("delete-child-btn"));
    expect(screen.getByTestId("confirm-delete-btn")).toBeTruthy();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("confirm-delete-btn")).toBeNull();
  });
});
