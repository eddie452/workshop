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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-dusty-denim">
          Confirm your information
        </h2>
        <p className="mt-2 text-sm text-dusty-denim">
          Review the details below. You can go back to make changes.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-card border border-champ-blue bg-white p-4">
        <dl className="space-y-3 text-sm">
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

      <p className="text-xs text-dusty-denim">
        By continuing, we will analyze your regional allergen data and build your
        personalized prediction. This typically takes about 4 seconds.
      </p>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-button border border-champ-blue bg-white px-4 py-2 text-sm font-medium text-dusty-denim hover:bg-white"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          data-testid="submit-onboarding"
          className="flex-1 rounded-button bg-dusty-denim px-4 py-2 text-sm font-medium text-white hover:bg-dusty-denim/80"
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
    <div className="flex justify-between">
      {label && (
        <dt className="font-medium text-dusty-denim">
          {label}
        </dt>
      )}
      <dd className="text-right text-dusty-denim">
        {value}
      </dd>
    </div>
  );
}
