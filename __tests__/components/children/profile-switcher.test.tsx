/**
 * ProfileSwitcher Component Tests
 *
 * Tests the profile dropdown for switching between parent and child profiles.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileSwitcher } from "@/components/children/profile-switcher";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";

const mockChildren: ChildProfileSummary[] = [
  {
    id: "child-1",
    name: "Alice",
    birth_year: 2020,
    created_at: "2024-01-15T00:00:00Z",
    has_pets: false,
    prior_allergy_diagnosis: false,
    known_allergens: null,
  },
  {
    id: "child-2",
    name: "Bob",
    birth_year: 2018,
    created_at: "2024-02-01T00:00:00Z",
    has_pets: true,
    prior_allergy_diagnosis: true,
    known_allergens: ["dust"],
  },
];

describe("ProfileSwitcher", () => {
  it("renders nothing when no children", () => {
    const { container } = render(
      <ProfileSwitcher
        activeChildId={null}
        childProfiles={[]}
        parentLabel="Mom"
        onSwitch={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows parent label when no child is active", () => {
    render(
      <ProfileSwitcher
        activeChildId={null}
        childProfiles={mockChildren}
        parentLabel="Mom"
        onSwitch={vi.fn()}
      />,
    );

    expect(screen.getByText("Mom")).toBeTruthy();
  });

  it("shows child name when child is active", () => {
    render(
      <ProfileSwitcher
        activeChildId="child-1"
        childProfiles={mockChildren}
        parentLabel="Mom"
        onSwitch={vi.fn()}
      />,
    );

    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("opens menu on toggle click", () => {
    render(
      <ProfileSwitcher
        activeChildId={null}
        childProfiles={mockChildren}
        parentLabel="Mom"
        onSwitch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("profile-switcher-toggle"));
    expect(screen.getByTestId("profile-switcher-menu")).toBeTruthy();
    expect(screen.getByTestId("profile-option-self")).toBeTruthy();
    expect(screen.getByTestId("profile-option-child-1")).toBeTruthy();
    expect(screen.getByTestId("profile-option-child-2")).toBeTruthy();
  });

  it("calls onSwitch(null) when self is selected", () => {
    const onSwitch = vi.fn();
    render(
      <ProfileSwitcher
        activeChildId="child-1"
        childProfiles={mockChildren}
        parentLabel="Mom"
        onSwitch={onSwitch}
      />,
    );

    fireEvent.click(screen.getByTestId("profile-switcher-toggle"));
    fireEvent.click(screen.getByTestId("profile-option-self"));
    expect(onSwitch).toHaveBeenCalledWith(null);
  });

  it("calls onSwitch with child ID when child is selected", () => {
    const onSwitch = vi.fn();
    render(
      <ProfileSwitcher
        activeChildId={null}
        childProfiles={mockChildren}
        parentLabel="Mom"
        onSwitch={onSwitch}
      />,
    );

    fireEvent.click(screen.getByTestId("profile-switcher-toggle"));
    fireEvent.click(screen.getByTestId("profile-option-child-2"));
    expect(onSwitch).toHaveBeenCalledWith("child-2");
  });

  it("closes menu after selection", () => {
    render(
      <ProfileSwitcher
        activeChildId={null}
        childProfiles={mockChildren}
        parentLabel="Mom"
        onSwitch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("profile-switcher-toggle"));
    expect(screen.getByTestId("profile-switcher-menu")).toBeTruthy();

    fireEvent.click(screen.getByTestId("profile-option-self"));
    expect(screen.queryByTestId("profile-switcher-menu")).toBeNull();
  });
});
