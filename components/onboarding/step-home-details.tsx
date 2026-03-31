"use client";

/**
 * Step 2: Home Details
 *
 * Shows auto-populated property data from BatchData when available,
 * or manual entry fields as fallback. Users can override any value.
 */

import type { StepProps } from "./types";
import type { HomeType } from "@/lib/supabase/types";

const HOME_TYPE_OPTIONS: { value: HomeType; label: string }[] = [
  { value: "single_family", label: "Single Family Home" },
  { value: "condo", label: "Condo" },
  { value: "apartment_low_rise", label: "Apartment (Low Rise)" },
  { value: "apartment_high_rise", label: "Apartment (High Rise)" },
  { value: "townhouse", label: "Townhouse" },
  { value: "mobile", label: "Mobile / Manufactured" },
  { value: "other", label: "Other" },
];

export function StepHomeDetails({
  formData,
  onUpdate,
  onNext,
  onBack,
}: StepProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            About your home
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Home characteristics affect indoor allergen exposure. We
            auto-populate what we can — feel free to adjust.
          </p>
        </div>

        {/* Home type */}
        <div>
          <label
            htmlFor="home_type"
            className="block text-sm font-medium text-gray-700"
          >
            Home type
          </label>
          <select
            id="home_type"
            value={formData.home_type ?? ""}
            onChange={(e) =>
              onUpdate({
                home_type: (e.target.value || null) as HomeType | null,
              })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select home type...</option>
            {HOME_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year built */}
        <div>
          <label
            htmlFor="year_built"
            className="block text-sm font-medium text-gray-700"
          >
            Year built (approximate)
          </label>
          <input
            id="year_built"
            type="number"
            min={1800}
            max={new Date().getFullYear()}
            value={formData.year_built ?? ""}
            onChange={(e) =>
              onUpdate({
                year_built: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="e.g. 1985"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Square footage */}
        <div>
          <label
            htmlFor="sqft"
            className="block text-sm font-medium text-gray-700"
          >
            Square footage (approximate)
          </label>
          <input
            id="sqft"
            type="number"
            min={100}
            max={50000}
            value={formData.sqft ?? ""}
            onChange={(e) =>
              onUpdate({
                sqft: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="e.g. 1500"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <p className="text-xs text-gray-500">
          All fields are optional. Older homes and certain construction types may
          have higher indoor allergen risk.
        </p>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    </form>
  );
}
