"use client";

/**
 * AddChildForm
 *
 * Form for creating a new child profile.
 * Collects name and optional birth year.
 */

import { useState } from "react";

export interface AddChildFormProps {
  onSubmit: (data: { name: string; birth_year?: number | null }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AddChildForm({ onSubmit, onCancel, isLoading, error }: AddChildFormProps) {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const currentYear = new Date().getFullYear();

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
      className="rounded-lg border border-brand-primary-light bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Add Child</h3>

      {error && (
        <p
          data-testid="add-child-error"
          className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}

      <div className="mb-3">
        <label
          htmlFor="child-name"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Name *
        </label>
        <input
          id="child-name"
          data-testid="child-name-input"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter child's name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="child-birth-year"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Birth Year (optional)
        </label>
        <input
          id="child-birth-year"
          data-testid="child-birth-year-input"
          type="number"
          min={currentYear - 18}
          max={currentYear}
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          placeholder={`e.g. ${currentYear - 5}`}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="save-child-btn"
          disabled={isLoading || !name.trim()}
          className="rounded-md bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-dark disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
