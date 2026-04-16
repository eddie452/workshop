"use client";

/**
 * ChildrenManager
 *
 * Main client component for the /children page.
 * Manages the list of child profiles with add, edit, and delete operations.
 */

import { useState, useCallback } from "react";
import { ChildProfileCard } from "./child-profile-card";
import { AddChildForm } from "./add-child-form";
import { EditChildForm } from "./edit-child-form";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";
import { MAX_CHILDREN } from "@/lib/child-profiles/types";

export interface ChildrenManagerProps {
  /** Initial list of child profiles from server */
  initialChildren: ChildProfileSummary[];
  /** Whether the user has family tier access */
  hasAccess: boolean;
  /** Maximum children allowed */
  maxChildren?: number;
}

export function ChildrenManager({
  initialChildren,
  hasAccess,
  maxChildren = MAX_CHILDREN,
}: ChildrenManagerProps) {
  const [childList, setChildList] = useState<ChildProfileSummary[]>(initialChildren);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(
    async (data: { name: string; birth_year?: number | null }) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`${window.location.origin}/api/children`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!result.success) {
          setError(result.error ?? "Failed to add child");
          return;
        }

        setChildList((prev) => [...prev, result.child]);
        setShowAddForm(false);
        setError(null);
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleDelete = useCallback(async (childId: string) => {
    setIsLoading(true);

    try {
      const res = await fetch(
        `${window.location.origin}/api/children?id=${childId}`,
        { method: "DELETE" },
      );

      const result = await res.json();

      if (result.success) {
        setChildList((prev) => prev.filter((c) => c.id !== childId));
      }
    } catch {
      // Silently fail — the card stays in the list
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEdit = useCallback((childId: string) => {
    setEditingId(childId);
    setShowAddForm(false);
    setError(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (childId: string, data: { name: string; birth_year?: number | null }) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${window.location.origin}/api/children?id=${childId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        const result = await res.json();

        if (!result.success) {
          setError(result.error ?? "Failed to update child");
          return;
        }

        setChildList((prev) =>
          prev.map((c) =>
            c.id === childId ? { ...c, name: data.name, birth_year: data.birth_year ?? null } : c,
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

  // Gate: show upgrade CTA if no family tier access
  if (!hasAccess) {
    return (
      <div data-testid="children-upgrade-gate" className="space-y-4">
        <p className="text-sm text-brand-text-secondary">
          Track allergies for up to {maxChildren} children with independent
          leaderboards and check-ins.
        </p>
        <UpgradeCta feature="child profiles" tierName="Madness Family" />
      </div>
    );
  }

  const canAddMore = childList.length < maxChildren;

  return (
    <div data-testid="children-manager" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-text-secondary">
          {childList.length} of {maxChildren} profiles used
        </p>
        {canAddMore && !showAddForm && (
          <button
            type="button"
            data-testid="add-child-trigger"
            onClick={() => {
              setShowAddForm(true);
              setError(null);
            }}
            className="rounded-button bg-brand-premium px-4 py-2 text-xs font-semibold text-white hover:bg-brand-premium/80"
          >
            + Add Child
          </button>
        )}
      </div>

      {/* Add child form */}
      {showAddForm && (
        <AddChildForm
          onSubmit={handleAdd}
          onCancel={() => {
            setShowAddForm(false);
            setError(null);
          }}
          isLoading={isLoading}
          error={error}
        />
      )}

      {/* Child list */}
      {childList.length === 0 && !showAddForm ? (
        <div
          data-testid="empty-children-state"
          className="rounded-card border border-dashed border-brand-border bg-brand-surface-muted p-8 text-center"
        >
          <p className="mb-2 text-sm font-medium text-brand-text">
            No child profiles yet
          </p>
          <p className="mb-4 text-xs text-brand-text-muted">
            Add a child to track their allergy triggers independently.
          </p>
          <button
            type="button"
            data-testid="empty-state-add-btn"
            onClick={() => setShowAddForm(true)}
            className="rounded-button bg-brand-premium px-4 py-2 text-xs font-semibold text-white hover:bg-brand-premium/80"
          >
            + Add Your First Child
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {childList.map((child) =>
            editingId === child.id ? (
              <EditChildForm
                key={child.id}
                child={child}
                onSubmit={handleEditSubmit}
                onCancel={() => {
                  setEditingId(null);
                  setError(null);
                }}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <ChildProfileCard
                key={child.id}
                child={child}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ),
          )}
        </div>
      )}

      {/* Max limit reached notice */}
      {!canAddMore && (
        <p
          data-testid="max-children-notice"
          className="text-center text-xs text-brand-text-muted"
        >
          Maximum of {maxChildren} child profiles reached.
        </p>
      )}

    </div>
  );
}
