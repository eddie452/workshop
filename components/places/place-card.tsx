"use client";

/**
 * PlaceCard
 *
 * Displays a single saved place with nickname, address, last-visit, and
 * action buttons. Used in the /places management page.
 */

import { useState } from "react";
import type { SavedPlaceSummary } from "@/lib/saved-places/types";

export interface PlaceCardProps {
  place: SavedPlaceSummary;
  onDelete: (placeId: string) => void;
  onEdit: (placeId: string) => void;
}

function formatLastVisit(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PlaceCard({ place, onDelete, onEdit }: PlaceCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nickname = place.nickname ?? "Unnamed place";
  const lastVisit = formatLastVisit(place.last_visit);

  return (
    <div
      data-testid="place-card"
      className="flex items-center justify-between rounded-card border border-champ-blue bg-white p-4 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-champ-blue text-sm font-bold text-white">
          {nickname.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dusty-denim">
            {nickname}
          </p>
          {place.address && (
            <p className="truncate text-xs text-dusty-denim">
              {place.address}
            </p>
          )}
          {lastVisit && (
            <p className="text-xs text-dusty-denim">
              Last visit: {lastVisit}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="edit-place-btn"
          className="rounded-button border border-champ-blue bg-white px-3 py-1.5 text-xs font-medium text-dusty-denim hover:bg-white"
          onClick={() => onEdit(place.id)}
        >
          Edit
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="confirm-delete-place-btn"
              className="rounded-button bg-dusty-denim px-3 py-1.5 text-xs font-medium text-white hover:bg-dusty-denim/80"
              onClick={() => {
                onDelete(place.id);
                setConfirmDelete(false);
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="rounded-button border border-champ-blue bg-white px-3 py-1.5 text-xs font-medium text-dusty-denim hover:bg-white"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="delete-place-btn"
            className="rounded-button border border-champ-blue bg-white px-3 py-1.5 text-xs font-medium text-dusty-denim hover:bg-white"
            onClick={() => setConfirmDelete(true)}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
