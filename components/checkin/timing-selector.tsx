"use client";

/**
 * Timing Selector
 *
 * Captures when symptoms peak (morning, midday, evening, all day)
 * and whether the user was mostly indoors or outdoors.
 */

import type { SymptomPeakTime } from "@/lib/supabase/types";
import { TIMING_OPTIONS } from "./types";

interface TimingSelectorProps {
  peakTime: SymptomPeakTime;
  mostlyIndoors: boolean;
  onPeakTimeChange: (value: SymptomPeakTime) => void;
  onIndoorsChange: (value: boolean) => void;
}

export function TimingSelector({
  peakTime,
  mostlyIndoors,
  onPeakTimeChange,
  onIndoorsChange,
}: TimingSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Peak time */}
      <fieldset className="border-none p-0 m-0">
        <legend className="mb-3 text-base font-semibold text-gray-900">
          When are symptoms worst?
        </legend>

        <div className="grid grid-cols-2 gap-2">
          {TIMING_OPTIONS.map((option) => {
            const isSelected = peakTime === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`timing-${option.value}`}
                onClick={() => onPeakTimeChange(option.value)}
                className={`cursor-pointer rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Indoor / outdoor context */}
      <fieldset className="border-none p-0 m-0">
        <legend className="mb-3 text-base font-semibold text-gray-900">
          Where did you spend most of your time?
        </legend>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: "Mostly indoors" },
            { value: false, label: "Mostly outdoors" },
          ].map((option) => {
            const isSelected = mostlyIndoors === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`indoors-${option.value}`}
                onClick={() => onIndoorsChange(option.value)}
                className={`cursor-pointer rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
