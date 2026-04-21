"use client";

/**
 * Daily Check-in Form
 *
 * Primary data collection surface for Allergy Madness.
 * Collects severity, symptom zones, timing, and indoor/outdoor context.
 * Submits to POST /api/checkin which auto-fetches environmental data
 * and triggers a tournament run.
 *
 * One check-in per day per user enforced server-side.
 */

import { useState, useCallback } from "react";
import type { SymptomPeakTime } from "@/lib/supabase/types";
import {
  INITIAL_CHECKIN_DATA,
  type CheckinFormData,
  type CheckinResponse,
  type CheckinErrorResponse,
} from "./types";
import { SeveritySlider } from "./severity-slider";
import { SymptomZones } from "./symptom-zones";
import { TimingSelector } from "./timing-selector";

interface CheckinFormProps {
  /** Called after successful check-in with the response */
  onSuccess?: (result: CheckinResponse) => void;
  /** Whether the user already checked in today */
  alreadyCheckedIn?: boolean;
}

export function CheckinForm({ onSuccess, alreadyCheckedIn = false }: CheckinFormProps) {
  const [formData, setFormData] = useState<CheckinFormData>(INITIAL_CHECKIN_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSeverityChange = useCallback((severity: number) => {
    setFormData((prev) => ({
      ...prev,
      severity,
      symptoms: severity === 0 ? {} : prev.symptoms,
    }));
  }, []);

  const handleSymptomsChange = useCallback(
    (symptoms: Record<string, boolean>) => {
      setFormData((prev) => ({ ...prev, symptoms }));
    },
    [],
  );

  const handlePeakTimeChange = useCallback((symptom_peak_time: SymptomPeakTime) => {
    setFormData((prev) => ({ ...prev, symptom_peak_time }));
  }, []);

  const handleIndoorsChange = useCallback((mostly_indoors: boolean) => {
    setFormData((prev) => ({ ...prev, mostly_indoors }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            severity: formData.severity,
            symptoms: formData.symptoms,
            symptom_peak_time: formData.symptom_peak_time,
            mostly_indoors: formData.mostly_indoors,
          }),
        });

        const data: CheckinResponse | CheckinErrorResponse =
          await response.json();

        if (!response.ok || !data.success) {
          const errData = data as CheckinErrorResponse;
          setError(errData.error || "Check-in failed. Please try again.");
          return;
        }

        setSubmitted(true);
        onSuccess?.(data as CheckinResponse);
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSuccess],
  );

  // Already checked in today
  if (alreadyCheckedIn || submitted) {
    return (
      <div
        className="rounded-card border border-champ-blue bg-white p-6 text-center"
        data-testid="checkin-complete"
      >
        <p className="text-lg font-semibold text-dusty-denim">
          {submitted ? "Check-in submitted!" : "Already checked in today"}
        </p>
        <p className="mt-2 text-sm text-dusty-denim">
          {submitted
            ? "Your leaderboard is being updated."
            : "Come back tomorrow for your next check-in."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
      data-testid="checkin-form"
    >
      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-card border border-alert-red bg-white px-4 py-3 text-sm text-alert-red"
          data-testid="checkin-error"
        >
          {error}
        </div>
      )}

      {/* Step 1: Severity */}
      <SeveritySlider value={formData.severity} onChange={handleSeverityChange} />

      {/* Step 2: Symptom zones (only if severity > 0) */}
      {formData.severity > 0 && (
        <SymptomZones
          symptoms={formData.symptoms}
          onChange={handleSymptomsChange}
        />
      )}

      {/* Step 3: Timing and context (only if severity > 0) */}
      {formData.severity > 0 && (
        <TimingSelector
          peakTime={formData.symptom_peak_time}
          mostlyIndoors={formData.mostly_indoors}
          onPeakTimeChange={handlePeakTimeChange}
          onIndoorsChange={handleIndoorsChange}
        />
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="checkin-submit"
        className="w-full rounded-button bg-dusty-denim px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-dusty-denim/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : formData.severity === 0 ? "Log Symptom-Free Day" : "Submit Check-in"}
      </button>

      {/* Severity 0 hint */}
      {formData.severity === 0 && (
        <p className="text-center text-xs text-dusty-denim">
          Logging a symptom-free day helps calibrate your Environmental Forecast.
        </p>
      )}
    </form>
  );
}
