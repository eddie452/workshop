"use client";

/**
 * Step 3: Health Questions
 *
 * Three key questions from the ticket:
 * - Pets (yes/no + types)
 * - Prior allergy diagnosis
 * - Seasonal pattern
 *
 * Plus indoor risk factors (mold/moisture, cockroach sighting, smoking).
 */

import type { StepProps } from "./types";
import type { SeasonalPattern } from "@/lib/supabase/types";

const SEASONAL_OPTIONS: { value: SeasonalPattern; label: string }[] = [
  { value: "spring", label: "Mostly in spring" },
  { value: "summer", label: "Mostly in summer" },
  { value: "fall", label: "Mostly in fall" },
  { value: "year_round", label: "Year-round" },
  { value: "unknown", label: "Not sure" },
];

const PET_OPTIONS = ["Dog", "Cat", "Bird", "Rodent", "Other"];

export function StepHealthQuestions({
  formData,
  onUpdate,
  onNext,
  onBack,
}: StepProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  function togglePetType(pet: string) {
    const current = formData.pet_types;
    if (current.includes(pet)) {
      onUpdate({ pet_types: current.filter((p) => p !== pet) });
    } else {
      onUpdate({ pet_types: [...current, pet] });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-brand-primary-dark">
            A few quick questions
          </h2>
          <p className="mt-2 text-sm text-brand-text-secondary">
            These help us fine-tune your allergen predictions.
          </p>
        </div>

        {/* Pets */}
        <fieldset className="border-none p-0 m-0">
          <legend className="mb-2 text-sm font-medium text-brand-text">
            Do you have pets at home?
          </legend>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="has_pets"
                checked={formData.has_pets}
                onChange={() => onUpdate({ has_pets: true })}
              />
              Yes
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="has_pets"
                checked={!formData.has_pets}
                onChange={() =>
                  onUpdate({ has_pets: false, pet_types: [] })
                }
              />
              No
            </label>
          </div>
          {formData.has_pets && (
            <div className="mt-3 flex flex-wrap gap-2">
              {PET_OPTIONS.map((pet) => {
                const selected = formData.pet_types.includes(pet);
                return (
                  <button
                    key={pet}
                    type="button"
                    onClick={() => togglePetType(pet)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer ${
                      selected
                        ? "border-brand-primary bg-brand-primary-light text-brand-primary-dark"
                        : "border-brand-border bg-white text-brand-text"
                    }`}
                    aria-pressed={selected}
                  >
                    {pet}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        {/* Prior diagnosis */}
        <fieldset className="border-none p-0 m-0">
          <legend className="mb-2 text-sm font-medium text-brand-text">
            Have you been diagnosed with allergies before?
          </legend>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="prior_diagnosis"
                checked={formData.prior_allergy_diagnosis}
                onChange={() =>
                  onUpdate({ prior_allergy_diagnosis: true })
                }
              />
              Yes
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="prior_diagnosis"
                checked={!formData.prior_allergy_diagnosis}
                onChange={() =>
                  onUpdate({ prior_allergy_diagnosis: false })
                }
              />
              No
            </label>
          </div>
        </fieldset>

        {/* Seasonal pattern */}
        <div>
          <label
            htmlFor="seasonal_pattern"
            className="block text-sm font-medium text-brand-text"
          >
            When are your symptoms worst?
          </label>
          <select
            id="seasonal_pattern"
            value={formData.seasonal_pattern}
            onChange={(e) =>
              onUpdate({
                seasonal_pattern: e.target.value as SeasonalPattern,
              })
            }
            className="mt-1 block w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm"
          >
            {SEASONAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Indoor risk factors */}
        <fieldset className="border-none p-0 m-0">
          <legend className="mb-2 text-sm font-medium text-brand-text">
            Indoor risk factors (check any that apply)
          </legend>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.has_mold_moisture}
                onChange={(e) =>
                  onUpdate({ has_mold_moisture: e.target.checked })
                }
              />
              Mold or moisture issues
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.cockroach_sighting}
                onChange={(e) =>
                  onUpdate({ cockroach_sighting: e.target.checked })
                }
              />
              Cockroach sightings
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.smoking_in_home}
                onChange={(e) =>
                  onUpdate({ smoking_in_home: e.target.checked })
                }
              />
              Smoking in the home
            </label>
          </div>
        </fieldset>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-md border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-surface-muted"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark"
          >
            Continue
          </button>
        </div>
      </div>
    </form>
  );
}
