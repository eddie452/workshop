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
      className="rounded-card border border-champ-blue bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-dusty-denim">Edit Child</h3>

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
          className="flex items-center justify-center rounded-button border border-champ-blue bg-white px-6 py-2.5 text-center text-sm font-medium text-dusty-denim hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="edit-child-save-btn"
          disabled={isLoading || !name.trim()}
          className="flex items-center justify-center rounded-button bg-dusty-denim px-6 py-2.5 text-center text-sm font-semibold text-white hover:bg-dusty-denim/80 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
