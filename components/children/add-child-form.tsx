"use client";

/**
 * AddChildForm
 *
 * Form for creating a new child profile.
 * Collects name and optional birth year via the shared ChildFormFields.
 */

import { useState } from "react";
import { ChildFormFields } from "./child-form-fields";

export interface AddChildFormProps {
  onSubmit: (data: { name: string; birth_year?: number | null }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AddChildForm({ onSubmit, onCancel, isLoading, error }: AddChildFormProps) {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedYear = birthYear ? parseInt(birthYear, 10) : null;
    await onSubmit({
      name: name.trim(),
      birth_year: parsedYear && !isNaN(parsedYear) ? parsedYear : null,
    });
  };

  return (
    <form
      data-testid="add-child-form"
      onSubmit={handleSubmit}
      className="rounded-card border border-champ-blue bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-dusty-denim">Add Child</h3>

      <ChildFormFields
        idPrefix="add"
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
          className="rounded-button border border-champ-blue bg-white px-4 py-2 text-xs font-medium text-dusty-denim hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="save-child-btn"
          disabled={isLoading || !name.trim()}
          className="rounded-button bg-dusty-denim px-4 py-2 text-xs font-semibold text-white hover:bg-dusty-denim/80 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
