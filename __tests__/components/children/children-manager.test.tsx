/**
 * ChildrenManager Component Tests
 *
 * Tests the main child profile management component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildrenManager } from "@/components/children/children-manager";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";

// Mock fetch for API calls
vi.stubGlobal("fetch", vi.fn());

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

describe("ChildrenManager", () => {
  it("shows upgrade CTA when user lacks family tier access", () => {
    render(
      <ChildrenManager
        initialChildren={[]}
        hasAccess={false}
      />,
    );

    expect(screen.getByTestId("children-upgrade-gate")).toBeTruthy();
    expect(screen.getByTestId("upgrade-cta")).toBeTruthy();
  });

  it("shows empty state when no children and has access", () => {
    render(
      <ChildrenManager
        initialChildren={[]}
        hasAccess={true}
      />,
    );

    expect(screen.getByTestId("empty-children-state")).toBeTruthy();
    expect(screen.getByTestId("empty-state-add-btn")).toBeTruthy();
  });

  it("renders child profile cards when children exist", () => {
    render(
      <ChildrenManager
        initialChildren={mockChildren}
        hasAccess={true}
      />,
    );

    expect(screen.getByTestId("children-manager")).toBeTruthy();
    const cards = screen.getAllByTestId("child-profile-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows profile count", () => {
    render(
      <ChildrenManager
        initialChildren={mockChildren}
        hasAccess={true}
      />,
    );

    expect(screen.getByText("2 of 5 profiles used")).toBeTruthy();
  });

  it("shows add button when under limit", () => {
    render(
      <ChildrenManager
        initialChildren={mockChildren}
        hasAccess={true}
      />,
    );

    expect(screen.getByTestId("add-child-trigger")).toBeTruthy();
  });

  it("shows max notice when at limit", () => {
    const fiveChildren: ChildProfileSummary[] = Array.from(
      { length: 5 },
      (_, i) => ({
        id: `child-${i}`,
        name: `Child ${i + 1}`,
        birth_year: 2020,
        created_at: `2024-0${i + 1}-01T00:00:00Z`,
        has_pets: false,
        prior_allergy_diagnosis: false,
        known_allergens: null,
      }),
    );

    render(
      <ChildrenManager
        initialChildren={fiveChildren}
        hasAccess={true}
      />,
    );

    expect(screen.getByTestId("max-children-notice")).toBeTruthy();
    expect(screen.queryByTestId("add-child-trigger")).toBeNull();
  });
});
