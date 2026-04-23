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
      <legend className="mb-3 text-base font-semibold text-dusty-denim">
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
              className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 px-4 py-3 text-center transition-colors ${
                isSelected
                  ? "border-champ-blue bg-champ-blue text-white"
                  : "border-champ-blue bg-white text-dusty-denim hover:border-champ-blue"
              }`}
            >
              <div className="mb-1 flex items-center justify-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: level.color }}
                  aria-hidden="true"
                />
                <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-dusty-denim"}`}>
                  {level.label}
                </span>
              </div>
              <p className={`break-words text-xs ${isSelected ? "text-white" : "text-dusty-denim"}`}>
                {level.description}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
