"use client";

/**
 * ChildProfileCard
 *
 * Displays a single child profile with name, age, and action buttons.
 * Used in the /children management page.
 */

import { useState } from "react";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";

export interface ChildProfileCardProps {
  child: ChildProfileSummary;
  onDelete: (childId: string) => void;
  onEdit: (childId: string) => void;
}

export function ChildProfileCard({ child, onDelete, onEdit }: ChildProfileCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentYear = new Date().getFullYear();
  const age = child.birth_year ? currentYear - child.birth_year : null;

  return (
    <div
      data-testid="child-profile-card"
      className="flex items-center justify-between rounded-card border border-champ-blue bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-champ-blue text-sm font-bold text-white">
          {child.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-dusty-denim">{child.name}</p>
          {age !== null && (
            <p className="text-xs text-dusty-denim">
              Age {age}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="edit-child-btn"
          className="rounded-button border border-champ-blue bg-white px-3 py-1.5 text-xs font-medium text-dusty-denim hover:bg-white"
          onClick={() => onEdit(child.id)}
        >
          Edit
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="confirm-delete-btn"
              className="rounded-button bg-champ-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-champ-blue/80"
              onClick={() => {
                onDelete(child.id);
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
            data-testid="delete-child-btn"
            className="rounded-button border border-champ-blue bg-white px-3 py-1.5 text-xs font-medium text-champ-blue hover:bg-white"
            onClick={() => setConfirmDelete(true)}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
