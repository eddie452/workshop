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
    <fieldset className="border-none p-0 m-0">
      <legend className="mb-3 text-base font-semibold text-brand-primary-dark">
        Which areas are affected?
      </legend>

      <div className="space-y-2">
        {SYMPTOM_ZONES.map((zone) => {
          const isExpanded = expandedZones.has(zone.id);
          const activeCount = getZoneSymptomCount(zone.id);

          return (
            <div
              key={zone.id}
              className="overflow-hidden rounded-lg border border-brand-border"
              data-testid={`zone-${zone.id}`}
            >
              {/* Zone header — toggle expand */}
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`zone-panel-${zone.id}`}
                onClick={() => toggleZone(zone.id)}
                className="flex w-full cursor-pointer items-center justify-between border-none bg-brand-surface-muted px-4 py-3 transition-colors hover:bg-brand-surface-muted"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary-light text-sm font-bold text-brand-primary-dark"
                    aria-hidden="true"
                  >
                    {zone.icon}
                  </span>
                  <span className="text-sm font-medium text-brand-primary-dark">
                    {zone.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <span
                      className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white"
                      aria-label={`${activeCount} symptom${activeCount !== 1 ? "s" : ""} selected`}
                    >
                      {activeCount}
                    </span>
                  )}
                  <span
                    className={`text-sm text-brand-text-faint transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                  className="space-y-2 px-4 py-3"
                >
                  {zone.symptoms.map((symptom) => {
                    const isChecked = !!symptoms[symptom.key];
                    return (
                      <label
                        key={symptom.key}
                        className="flex cursor-pointer items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSymptom(symptom.key)}
                          data-testid={`symptom-${symptom.key}`}
                          className="h-5 w-5 rounded border-brand-border accent-brand-primary"
                        />
                        <span className="text-sm text-brand-text">
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
