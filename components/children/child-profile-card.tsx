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
      className="flex items-center justify-between rounded-card border border-brand-border bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-light text-sm font-bold text-brand-primary">
          {child.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-primary-dark">{child.name}</p>
          {age !== null && (
            <p className="text-xs text-brand-text-muted">
              Age {age}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="edit-child-btn"
          className="rounded-button border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-brand-surface-muted"
          onClick={() => onEdit(child.id)}
        >
          Edit
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="confirm-delete-btn"
              className="rounded-button bg-[#055A8C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#044A72]"
              onClick={() => {
                onDelete(child.id);
                setConfirmDelete(false);
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="rounded-button border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-brand-surface-muted"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="delete-child-btn"
            className="rounded-button border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-[#055A8C] hover:bg-[#E0F0F8]"
            onClick={() => setConfirmDelete(true)}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
