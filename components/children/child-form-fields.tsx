"use client";

/**
 * ChildFormFields
 *
 * Shared input fields and error display for child profile forms.
 * Used by both AddChildForm (create) and EditChildForm (update).
 *
 * Each form keeps its own heading, submit handler, and action buttons;
 * this component owns only the repeating name input, birth year input,
 * and error banner markup.
 */

import type { ChangeEvent } from "react";

export interface ChildFormFieldsProps {
  /**
   * Prefix used to build stable `id` and `data-testid` values for inputs.
   * Pass "add" for the Add form and "edit" for the Edit form to preserve
   * the existing test ids the surrounding tests already rely on.
   */
  idPrefix: "add" | "edit";

  name: string;
  onNameChange: (value: string) => void;

  birthYear: string;
  onBirthYearChange: (value: string) => void;

  error: string | null;
}

const INPUT_CLASS =
  "w-full rounded-button border border-brand-border px-3 py-2 text-sm text-brand-primary-dark placeholder-brand-text-faint focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-brand-text";

export function ChildFormFields({
  idPrefix,
  name,
  onNameChange,
  birthYear,
  onBirthYearChange,
  error,
}: ChildFormFieldsProps) {
  const currentYear = new Date().getFullYear();

  // Preserve the exact id/testid shapes the existing tests depend on.
  const nameId = idPrefix === "add" ? "child-name" : "edit-child-name";
  const yearId = idPrefix === "add" ? "child-birth-year" : "edit-child-birth-year";
  const nameTestId = idPrefix === "add" ? "child-name-input" : "edit-child-name-input";
  const yearTestId =
    idPrefix === "add" ? "child-birth-year-input" : "edit-child-birth-year-input";
  const errorTestId = idPrefix === "add" ? "add-child-error" : "edit-child-error";

  return (
    <>
      {error && (
        <p
          data-testid={errorTestId}
          className="mb-3 rounded-card bg-[#E0F0F8] p-2 text-xs text-[#055A8C]"
        >
          {error}
        </p>
      )}

      <div className="mb-3">
        <label htmlFor={nameId} className={LABEL_CLASS}>
          Name *
        </label>
        <input
          id={nameId}
          data-testid={nameTestId}
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
          placeholder="Enter child's name"
          className={INPUT_CLASS}
        />
      </div>

      <div className="mb-4">
        <label htmlFor={yearId} className={LABEL_CLASS}>
          Birth Year (optional)
        </label>
        <input
          id={yearId}
          data-testid={yearTestId}
          type="number"
          min={currentYear - 18}
          max={currentYear}
          value={birthYear}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onBirthYearChange(e.target.value)}
          placeholder={`e.g. ${currentYear - 5}`}
          className={INPUT_CLASS}
        />
      </div>
    </>
  );
}
