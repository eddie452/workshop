"use client";

/**
 * PlacesManager
 *
 * Main client component for the /places page.
 * Manages the list of saved places with add, edit, and delete operations.
 *
 * This mirrors `components/children/children-manager.tsx`. The API refuses
 * mutations on home rows (403), so no home row can appear in this list.
 */

import { useState, useCallback } from "react";
import { PlaceCard } from "./place-card";
import { AddPlaceForm } from "./add-place-form";
import { EditPlaceForm } from "./edit-place-form";
import type {
  SavedPlaceSummary,
  CreatePlaceInput,
  UpdatePlaceInput,
} from "@/lib/saved-places/types";

export interface PlacesManagerProps {
  /** Initial list of saved places from server */
  initialPlaces: SavedPlaceSummary[];
}

export function PlacesManager({ initialPlaces }: PlacesManagerProps) {
  const [placeList, setPlaceList] =
    useState<SavedPlaceSummary[]>(initialPlaces);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(async (data: CreatePlaceInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${window.location.origin}/api/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error ?? "Failed to add place");
        return;
      }

      setPlaceList((prev) => [...prev, result.place]);
      setShowAddForm(false);
      setError(null);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (placeId: string) => {
    setIsLoading(true);

    try {
      const res = await fetch(
        `${window.location.origin}/api/locations?id=${placeId}`,
        { method: "DELETE" },
      );
      const result = await res.json();

      if (result.success) {
        setPlaceList((prev) => prev.filter((p) => p.id !== placeId));
      }
    } catch {
      // Silently fail — the card stays in the list
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEdit = useCallback((placeId: string) => {
    setEditingId(placeId);
    setShowAddForm(false);
    setError(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (placeId: string, data: UpdatePlaceInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${window.location.origin}/api/locations?id=${placeId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
        const result = await res.json();

        if (!result.success) {
          setError(result.error ?? "Failed to update place");
          return;
        }

        setPlaceList((prev) =>
          prev.map((p) =>
            p.id === placeId
              ? {
                  ...p,
                  nickname: data.nickname ?? p.nickname,
                  address: data.address !== undefined ? data.address : p.address,
                  zip: data.zip !== undefined ? data.zip : p.zip,
                  state: data.state !== undefined ? data.state : p.state,
                }
              : p,
          ),
        );
        setEditingId(null);
        setError(null);
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return (
    <div data-testid="places-manager" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-text-secondary">
          {placeList.length} saved place{placeList.length === 1 ? "" : "s"}
        </p>
        {!showAddForm && (
          <button
            type="button"
            data-testid="add-place-trigger"
            onClick={() => {
              setShowAddForm(true);
              setError(null);
            }}
            className="rounded-button bg-brand-premium px-4 py-2 text-xs font-semibold text-white hover:bg-brand-premium/80"
          >
            + Add Place
          </button>
        )}
      </div>

      {showAddForm && (
        <AddPlaceForm
          onSubmit={handleAdd}
          onCancel={() => {
            setShowAddForm(false);
            setError(null);
          }}
          isLoading={isLoading}
          error={error}
        />
      )}

      {placeList.length === 0 && !showAddForm ? (
        <div
          data-testid="empty-places-state"
          className="rounded-card border border-dashed border-brand-border bg-brand-surface-muted p-8 text-center"
        >
          <p className="mb-2 text-sm font-medium text-brand-text">
            No saved places yet
          </p>
          <p className="mb-4 text-xs text-brand-text-muted">
            Save recurring locations (grandma&apos;s house, vacation home) to
            track their allergen profile independently.
          </p>
          <button
            type="button"
            data-testid="empty-state-add-place-btn"
            onClick={() => setShowAddForm(true)}
            className="rounded-button bg-brand-premium px-4 py-2 text-xs font-semibold text-white hover:bg-brand-premium/80"
          >
            + Add Your First Place
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {placeList.map((place) =>
            editingId === place.id ? (
              <EditPlaceForm
                key={place.id}
                place={place}
                onSubmit={handleEditSubmit}
                onCancel={() => {
                  setEditingId(null);
                  setError(null);
                }}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <PlaceCard
                key={place.id}
                place={place}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
