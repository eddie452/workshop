/**
 * PlacesManager Component Tests
 *
 * Covers list render, empty state, add-form submit, edit-form submit,
 * and delete-confirm flow. Fetch is stubbed globally.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlacesManager } from "@/components/places/places-manager";
import type { SavedPlaceSummary } from "@/lib/saved-places/types";

vi.stubGlobal("fetch", vi.fn());

const mockPlaces: SavedPlaceSummary[] = [
  {
    id: "place-1",
    nickname: "Grandma's",
    address: "123 Maple",
    lat: null,
    lng: null,
    zip: "12345",
    state: "CA",
    last_visit: null,
    visit_count: 0,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "place-2",
    nickname: "Cabin",
    address: null,
    lat: null,
    lng: null,
    zip: null,
    state: null,
    last_visit: "2026-03-15T00:00:00Z",
    visit_count: 3,
    created_at: "2026-02-01T00:00:00Z",
  },
];

describe("PlacesManager", () => {
  it("shows empty state when no places exist", () => {
    render(<PlacesManager initialPlaces={[]} />);
    expect(screen.getByTestId("empty-places-state")).toBeTruthy();
    expect(screen.getByTestId("empty-state-add-place-btn")).toBeTruthy();
  });

  it("renders place cards when places exist", () => {
    render(<PlacesManager initialPlaces={mockPlaces} />);
    const cards = screen.getAllByTestId("place-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Grandma's")).toBeTruthy();
    expect(screen.getByText("Cabin")).toBeTruthy();
  });

  it("shows count label", () => {
    render(<PlacesManager initialPlaces={mockPlaces} />);
    expect(screen.getByText("2 saved places")).toBeTruthy();
  });

  it("opens add form on trigger click", () => {
    render(<PlacesManager initialPlaces={mockPlaces} />);
    fireEvent.click(screen.getByTestId("add-place-trigger"));
    expect(screen.getByTestId("add-place-form")).toBeTruthy();
    expect(screen.getByTestId("add-place-nickname-input")).toBeTruthy();
  });

  it("submits add form and appends the new place", async () => {
    const newPlace: SavedPlaceSummary = {
      id: "place-3",
      nickname: "Office",
      address: null,
      lat: null,
      lng: null,
      zip: null,
      state: null,
      last_visit: null,
      visit_count: 0,
      created_at: "2026-04-01T00:00:00Z",
    };
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, place: newPlace }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<PlacesManager initialPlaces={[]} />);
    fireEvent.click(screen.getByTestId("empty-state-add-place-btn"));

    const nicknameInput = screen.getByTestId("add-place-nickname-input");
    fireEvent.change(nicknameInput, { target: { value: "Office" } });
    fireEvent.click(screen.getByTestId("save-place-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/locations"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText("Office")).toBeTruthy();
    });
  });

  it("renders error when add fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ success: false, error: "Nickname is required" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<PlacesManager initialPlaces={[]} />);
    fireEvent.click(screen.getByTestId("empty-state-add-place-btn"));

    const nicknameInput = screen.getByTestId("add-place-nickname-input");
    fireEvent.change(nicknameInput, { target: { value: "Hi" } });
    fireEvent.click(screen.getByTestId("save-place-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("add-place-error")).toBeTruthy();
    });
  });

  it("submits edit form and updates the place", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<PlacesManager initialPlaces={mockPlaces} />);
    const editButtons = screen.getAllByTestId("edit-place-btn");
    fireEvent.click(editButtons[0]);

    const nicknameInput = screen.getByTestId("edit-place-nickname-input");
    fireEvent.change(nicknameInput, { target: { value: "Grandma House" } });
    fireEvent.click(screen.getByTestId("edit-place-save-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/locations?id=place-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId("edit-place-form")).toBeNull();
      expect(screen.getByText("Grandma House")).toBeTruthy();
    });
  });

  it("cancels edit and returns to card view", () => {
    render(<PlacesManager initialPlaces={mockPlaces} />);
    const editButtons = screen.getAllByTestId("edit-place-btn");
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId("edit-place-form")).toBeTruthy();

    fireEvent.click(screen.getByTestId("edit-place-cancel-btn"));
    expect(screen.queryByTestId("edit-place-form")).toBeNull();
    expect(screen.getAllByTestId("place-card")).toHaveLength(2);
  });

  it("confirms and deletes a place", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<PlacesManager initialPlaces={mockPlaces} />);
    const deleteButtons = screen.getAllByTestId("delete-place-btn");
    fireEvent.click(deleteButtons[0]);

    const confirmBtn = screen.getByTestId("confirm-delete-place-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/locations?id=place-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    await waitFor(() => {
      const remaining = screen.getAllByTestId("place-card");
      expect(remaining).toHaveLength(1);
      expect(screen.queryByText("Grandma's")).toBeNull();
    });
  });
});
