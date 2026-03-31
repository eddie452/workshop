"use client";

/**
 * Symptom Zones
 *
 * Displays the 6 symptom zones as expandable groups of checkboxes.
 * Each zone maps to individual sx_* columns in the symptom_checkins table.
 *
 * Only shown when severity > 0.
 */

import { useState } from "react";
import { SYMPTOM_ZONES, type CheckinSymptomZone } from "./types";

interface SymptomZonesProps {
  symptoms: Record<string, boolean>;
  onChange: (symptoms: Record<string, boolean>) => void;
}

export function SymptomZones({ symptoms, onChange }: SymptomZonesProps) {
  const [expandedZones, setExpandedZones] = useState<Set<CheckinSymptomZone>>(
    new Set(),
  );

  const toggleZone = (zoneId: CheckinSymptomZone) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  };

  const toggleSymptom = (key: string) => {
    onChange({ ...symptoms, [key]: !symptoms[key] });
  };

  const getZoneSymptomCount = (zoneId: CheckinSymptomZone): number => {
    const zone = SYMPTOM_ZONES.find((z) => z.id === zoneId);
    if (!zone) return 0;
    return zone.symptoms.filter((s) => symptoms[s.key]).length;
  };

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
        Which areas are affected?
      </legend>

      <div
        className="space-y-2"
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {SYMPTOM_ZONES.map((zone) => {
          const isExpanded = expandedZones.has(zone.id);
          const activeCount = getZoneSymptomCount(zone.id);

          return (
            <div
              key={zone.id}
              className="rounded-lg border border-gray-200 overflow-hidden"
              style={{
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
              data-testid={`zone-${zone.id}`}
            >
              {/* Zone header — toggle expand */}
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`zone-panel-${zone.id}`}
                onClick={() => toggleZone(zone.id)}
                className="flex w-full items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#f9fafb",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700"
                    style={{
                      display: "flex",
                      height: "2rem",
                      width: "2rem",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "9999px",
                      backgroundColor: "#dbeafe",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "#1d4ed8",
                    }}
                    aria-hidden="true"
                  >
                    {zone.icon}
                  </span>
                  <span
                    className="text-sm font-medium text-gray-900"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#111827",
                    }}
                  >
                    {zone.label}
                  </span>
                </div>

                <div
                  className="flex items-center gap-2"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {activeCount > 0 && (
                    <span
                      className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white"
                      style={{
                        borderRadius: "9999px",
                        backgroundColor: "#2563eb",
                        padding: "0.125rem 0.5rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#ffffff",
                      }}
                      aria-label={`${activeCount} symptom${activeCount !== 1 ? "s" : ""} selected`}
                    >
                      {activeCount}
                    </span>
                  )}
                  <span
                    className="text-gray-400 text-sm"
                    style={{
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                      transition: "transform 0.15s",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-hidden="true"
                  >
                    &#9660;
                  </span>
                </div>
              </button>

              {/* Zone symptoms panel */}
              {isExpanded && (
                <div
                  id={`zone-panel-${zone.id}`}
                  role="group"
                  aria-label={`${zone.label} symptoms`}
                  className="px-4 py-3 space-y-2"
                  style={{
                    padding: "0.75rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {zone.symptoms.map((symptom) => {
                    const isChecked = !!symptoms[symptom.key];
                    return (
                      <label
                        key={symptom.key}
                        className="flex items-center gap-3 cursor-pointer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSymptom(symptom.key)}
                          data-testid={`symptom-${symptom.key}`}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600"
                          style={{
                            height: "1.25rem",
                            width: "1.25rem",
                            accentColor: "#2563eb",
                          }}
                        />
                        <span
                          className="text-sm text-gray-700"
                          style={{
                            fontSize: "0.875rem",
                            color: "#374151",
                          }}
                        >
                          {symptom.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
