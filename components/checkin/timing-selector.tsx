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
    <div
      className="space-y-6"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* Peak time */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          className="text-base font-semibold text-gray-900 mb-3"
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#111827",
            marginBottom: "0.75rem",
            padding: 0,
          }}
        >
          When are symptoms worst?
        </legend>

        <div
          className="grid grid-cols-2 gap-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem",
          }}
        >
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
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
                style={{
                  borderRadius: "0.5rem",
                  border: isSelected
                    ? "2px solid #2563eb"
                    : "2px solid #e5e7eb",
                  backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: isSelected ? "#1d4ed8" : "#374151",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Indoor / outdoor context */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          className="text-base font-semibold text-gray-900 mb-3"
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#111827",
            marginBottom: "0.75rem",
            padding: 0,
          }}
        >
          Where did you spend most of your time?
        </legend>

        <div
          className="grid grid-cols-2 gap-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem",
          }}
        >
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
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
                style={{
                  borderRadius: "0.5rem",
                  border: isSelected
                    ? "2px solid #2563eb"
                    : "2px solid #e5e7eb",
                  backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: isSelected ? "#1d4ed8" : "#374151",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
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
