"use client";

/**
 * Severity Slider
 *
 * Allows user to select overall symptom severity on a 0-3 scale.
 * Mobile-first, accessible with ARIA labels.
 */

import { SEVERITY_LEVELS } from "./types";

interface SeveritySliderProps {
  value: number;
  onChange: (severity: number) => void;
}

export function SeveritySlider({ value, onChange }: SeveritySliderProps) {
  return (
    <fieldset className="border-none p-0 m-0">
      <legend className="mb-3 text-base font-semibold text-gray-900">
        How are your allergies today?
      </legend>

      <div className="grid grid-cols-2 gap-3">
        {SEVERITY_LEVELS.map((level) => {
          const isSelected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${level.label}: ${level.description}`}
              data-testid={`severity-${level.value}`}
              onClick={() => onChange(level.value)}
              className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-colors ${
                isSelected
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: level.color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-gray-900">
                  {level.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {level.description}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
