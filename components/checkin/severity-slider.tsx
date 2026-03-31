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
    <fieldset
      style={{ border: "none", padding: 0, margin: 0 }}
    >
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
        How are your allergies today?
      </legend>

      <div
        className="grid grid-cols-2 gap-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
        }}
      >
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
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                isSelected
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
              style={{
                borderRadius: "0.5rem",
                border: isSelected
                  ? "2px solid #2563eb"
                  : "2px solid #e5e7eb",
                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                padding: "0.75rem",
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 0.15s, background-color 0.15s",
              }}
            >
              <div
                className="flex items-center gap-2 mb-1"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{
                    display: "inline-block",
                    height: "0.75rem",
                    width: "0.75rem",
                    borderRadius: "9999px",
                    backgroundColor: level.color,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm font-semibold text-gray-900"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {level.label}
                </span>
              </div>
              <p
                className="text-xs text-gray-500"
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                {level.description}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
