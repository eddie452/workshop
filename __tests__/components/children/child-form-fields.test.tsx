/**
 * ChildFormFields Component Tests
 *
 * Direct tests for the shared ChildFormFields inputs + error banner.
 * Sibling integration tests (`add-child-form.test.tsx`,
 * `edit-child-form.test.tsx`) cover full form behavior; these tests
 * focus on the contract ChildFormFields owns:
 *   - idPrefix-driven id / data-testid shapes
 *   - input attribute bounds (required, maxLength, type, min/max)
 *   - error banner presence/absence
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildFormFields } from "@/components/children/child-form-fields";

function renderFields(overrides: Partial<React.ComponentProps<typeof ChildFormFields>> = {}) {
  const props: React.ComponentProps<typeof ChildFormFields> = {
    idPrefix: "add",
    name: "",
    onNameChange: vi.fn(),
    birthYear: "",
    onBirthYearChange: vi.fn(),
    error: null,
    ...overrides,
  };
  return render(<ChildFormFields {...props} />);
}

describe("ChildFormFields", () => {
  it("renders add-prefixed ids when idPrefix is 'add'", () => {
    renderFields({ idPrefix: "add" });

    expect(document.getElementById("child-name")).not.toBeNull();
    expect(document.getElementById("child-birth-year")).not.toBeNull();
    expect(screen.getByTestId("child-name-input")).toBeTruthy();
    expect(screen.getByTestId("child-birth-year-input")).toBeTruthy();
  });

  it("renders edit-prefixed ids when idPrefix is 'edit'", () => {
    renderFields({ idPrefix: "edit" });

    expect(document.getElementById("edit-child-name")).not.toBeNull();
    expect(document.getElementById("edit-child-birth-year")).not.toBeNull();
    expect(screen.getByTestId("edit-child-name-input")).toBeTruthy();
    expect(screen.getByTestId("edit-child-birth-year-input")).toBeTruthy();
  });

  it("applies correct attributes to the name input", () => {
    renderFields({ idPrefix: "add" });

    const nameInput = screen.getByTestId("child-name-input") as HTMLInputElement;
    expect(nameInput.type).toBe("text");
    expect(nameInput.required).toBe(true);
    expect(nameInput.maxLength).toBe(100);
    expect(nameInput.placeholder).toBe("Enter child's name");
  });

  it("applies correct bounds and placeholder to the birth year input", () => {
    renderFields({ idPrefix: "add" });

    const yearInput = screen.getByTestId("child-birth-year-input") as HTMLInputElement;
    const currentYear = new Date().getFullYear();

    expect(yearInput.type).toBe("number");
    expect(Number(yearInput.min)).toBe(currentYear - 18);
    expect(Number(yearInput.max)).toBe(currentYear);
    expect(yearInput.placeholder).toBe(`e.g. ${currentYear - 5}`);
  });

  it("renders the error banner with the add test id when error is set and idPrefix is 'add'", () => {
    renderFields({ idPrefix: "add", error: "Something went wrong" });

    const banner = screen.getByTestId("add-child-error");
    expect(banner).toBeTruthy();
    expect(banner.textContent).toBe("Something went wrong");
  });

  it("renders the error banner with the edit test id when error is set and idPrefix is 'edit'", () => {
    renderFields({ idPrefix: "edit", error: "Validation failed" });

    const banner = screen.getByTestId("edit-child-error");
    expect(banner).toBeTruthy();
    expect(banner.textContent).toBe("Validation failed");
  });

  it("does not render the error banner when error is null", () => {
    renderFields({ idPrefix: "add", error: null });

    expect(screen.queryByTestId("add-child-error")).toBeNull();
    expect(screen.queryByTestId("edit-child-error")).toBeNull();
  });

  it("uses 4-color tokens (not raw hex) for the error banner classes", () => {
    renderFields({ idPrefix: "add", error: "Oops" });

    const banner = screen.getByTestId("add-child-error");
    // Guard against regressing back to raw hex literals.
    expect(banner.className).toContain("bg-white");
    expect(banner.className).toContain("text-alert-red");
    expect(banner.className).not.toMatch(/#E0F0F8/i);
    expect(banner.className).not.toMatch(/#055A8C/i);
  });
});
