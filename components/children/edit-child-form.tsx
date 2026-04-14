"use client";

/**
 * EditChildForm
 *
 * Inline form for editing an existing child profile.
 * Pre-populates with current values; submits via parent callback.
 * Shares name/birth-year markup with AddChildForm via ChildFormFields.
 */

import { useState } from "react";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";
import { ChildFormFields } from "./child-form-fields";

export interface EditChildFormProps {
  child: ChildProfileSummary;
  onSubmit: (childId: string, data: { name: string; birth_year?: number | null }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function EditChildForm({ child, onSubmit, onCancel, isLoading, error }: EditChildFormProps) {
  const [name, setName] = useState(child.name);
  const [birthYear, setBirthYear] = useState(child.birth_year?.toString() ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedYear = birthYear ? parseInt(birthYear, 10) : null;
    await onSubmit(child.id, {
      name: name.trim(),
      birth_year: parsedYear && !isNaN(parsedYear) ? parsedYear : null,
    });
  };

  return (
    <form
      data-testid="edit-child-form"
      onSubmit={handleSubmit}
      className="rounded-lg border border-brand-primary-light bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-brand-primary-dark">Edit Child</h3>

      <ChildFormFields
        idPrefix="edit"
        name={name}
        onNameChange={setName}
        birthYear={birthYear}
        onBirthYearChange={setBirthYear}
        error={error}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="edit-child-cancel-btn"
          className="rounded-md border border-brand-border bg-white px-4 py-2 text-xs font-medium text-brand-text hover:bg-brand-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="edit-child-save-btn"
          disabled={isLoading || !name.trim()}
          className="rounded-md bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-dark disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
