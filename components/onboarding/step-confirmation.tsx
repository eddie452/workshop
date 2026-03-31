"use client";

/**
 * Step 4: Confirmation
 *
 * Shows a summary of the data collected and lets the user submit.
 */

import type { StepProps } from "./types";

const SEASONAL_LABELS: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  year_round: "Year-round",
  unknown: "Not sure",
};

const HOME_TYPE_LABELS: Record<string, string> = {
  single_family: "Single Family Home",
  condo: "Condo",
  apartment_low_rise: "Apartment (Low Rise)",
  apartment_high_rise: "Apartment (High Rise)",
  townhouse: "Townhouse",
  mobile: "Mobile / Manufactured",
  other: "Other",
};

export function StepConfirmation({
  formData,
  onBack,
  onNext,
}: StepProps) {
  return (
    <div
      className="space-y-6"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <div>
        <h2
          className="text-xl font-bold text-gray-900"
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Confirm your information
        </h2>
        <p
          className="mt-2 text-sm text-gray-600"
          style={{
            fontSize: "0.875rem",
            color: "#4b5563",
            marginTop: "0.5rem",
          }}
        >
          Review the details below. You can go back to make changes.
        </p>
      </div>

      {/* Summary card */}
      <div
        className="rounded-md border border-gray-200 bg-gray-50 p-4"
        style={{
          borderRadius: "0.375rem",
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          padding: "1rem",
        }}
      >
        <dl
          className="space-y-3 text-sm"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <SummaryRow label="Address" value={formData.address} />
          <SummaryRow
            label="Home type"
            value={
              formData.home_type
                ? HOME_TYPE_LABELS[formData.home_type] ?? formData.home_type
                : "Not specified"
            }
          />
          <SummaryRow
            label="Year built"
            value={formData.year_built?.toString() ?? "Not specified"}
          />
          <SummaryRow
            label="Pets"
            value={
              formData.has_pets
                ? formData.pet_types.length > 0
                  ? formData.pet_types.join(", ")
                  : "Yes"
                : "No"
            }
          />
          <SummaryRow
            label="Prior diagnosis"
            value={formData.prior_allergy_diagnosis ? "Yes" : "No"}
          />
          <SummaryRow
            label="Worst season"
            value={SEASONAL_LABELS[formData.seasonal_pattern] ?? "Not sure"}
          />
          {formData.has_mold_moisture && (
            <SummaryRow label="Indoor risks" value="Mold / moisture" />
          )}
          {formData.cockroach_sighting && (
            <SummaryRow label="" value="Cockroach sightings" />
          )}
        </dl>
      </div>

      <p
        className="text-xs text-gray-500"
        style={{ fontSize: "0.75rem", color: "#6b7280" }}
      >
        By continuing, we will analyze your regional allergen data and build your
        personalized prediction. This typically takes about 4 seconds.
      </p>

      {/* Navigation */}
      <div
        className="flex gap-3"
        style={{ display: "flex", gap: "0.75rem" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          style={{
            flex: 1,
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            backgroundColor: "#ffffff",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          data-testid="submit-onboarding"
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          style={{
            flex: 1,
            borderRadius: "0.375rem",
            backgroundColor: "#2563eb",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Build My Prediction
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary row                                                          */
/* ------------------------------------------------------------------ */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between"
      style={{
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      {label && (
        <dt
          className="font-medium text-gray-500"
          style={{ fontWeight: 500, color: "#6b7280" }}
        >
          {label}
        </dt>
      )}
      <dd
        className="text-gray-900"
        style={{ color: "#111827", textAlign: "right" }}
      >
        {value}
      </dd>
    </div>
  );
}
