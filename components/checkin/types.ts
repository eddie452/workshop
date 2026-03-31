/**
 * Check-in Form Types
 *
 * Shared type definitions for the daily symptom check-in form.
 * These are client-safe types — no server-only data (income_tier, etc.).
 */

import type { SymptomPeakTime } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Symptom zones                                                       */
/* ------------------------------------------------------------------ */

/**
 * The 6 symptom zones used in the check-in form.
 * Each zone maps to a group of individual symptom checkboxes.
 *
 * Ticket guardrail: upper respiratory, ocular, lower respiratory,
 * dermal, ear, systemic — these map to the engine zones plus the
 * individual sx_ columns in symptom_checkins.
 */
export type CheckinSymptomZone =
  | "upper_respiratory"
  | "ocular"
  | "lower_respiratory"
  | "dermal"
  | "ear"
  | "systemic";

/**
 * Individual symptoms grouped by zone.
 * Keys match the sx_* columns in the symptom_checkins table.
 */
export interface ZoneSymptoms {
  upper_respiratory: {
    sx_sneezing: boolean;
    sx_runny_nose: boolean;
    sx_nasal_congestion: boolean;
    sx_nasal_itch: boolean;
  };
  ocular: {
    sx_itchy_eyes: boolean;
    sx_watery_eyes: boolean;
    sx_red_eyes: boolean;
  };
  lower_respiratory: {
    sx_cough: boolean;
    sx_wheeze: boolean;
    sx_chest_tightness: boolean;
    sx_shortness_breath: boolean;
  };
  dermal: {
    sx_skin_rash: boolean;
    sx_hives: boolean;
    sx_eczema: boolean;
  };
  ear: {
    sx_ear_fullness: boolean;
  };
  systemic: {
    sx_fatigue: boolean;
    sx_headache: boolean;
    sx_brain_fog: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Zone metadata                                                       */
/* ------------------------------------------------------------------ */

export interface ZoneConfig {
  id: CheckinSymptomZone;
  label: string;
  icon: string;
  symptoms: { key: string; label: string }[];
}

export const SYMPTOM_ZONES: ZoneConfig[] = [
  {
    id: "upper_respiratory",
    label: "Nose / Throat",
    icon: "N",
    symptoms: [
      { key: "sx_sneezing", label: "Sneezing" },
      { key: "sx_runny_nose", label: "Runny nose" },
      { key: "sx_nasal_congestion", label: "Nasal congestion" },
      { key: "sx_nasal_itch", label: "Nasal itch" },
    ],
  },
  {
    id: "ocular",
    label: "Eyes",
    icon: "E",
    symptoms: [
      { key: "sx_itchy_eyes", label: "Itchy eyes" },
      { key: "sx_watery_eyes", label: "Watery eyes" },
      { key: "sx_red_eyes", label: "Red eyes" },
    ],
  },
  {
    id: "lower_respiratory",
    label: "Lungs",
    icon: "L",
    symptoms: [
      { key: "sx_cough", label: "Cough" },
      { key: "sx_wheeze", label: "Wheeze" },
      { key: "sx_chest_tightness", label: "Chest tightness" },
      { key: "sx_shortness_breath", label: "Shortness of breath" },
    ],
  },
  {
    id: "dermal",
    label: "Skin",
    icon: "S",
    symptoms: [
      { key: "sx_skin_rash", label: "Skin rash" },
      { key: "sx_hives", label: "Hives" },
      { key: "sx_eczema", label: "Eczema flare" },
    ],
  },
  {
    id: "ear",
    label: "Ear",
    icon: "R",
    symptoms: [{ key: "sx_ear_fullness", label: "Ear fullness / pressure" }],
  },
  {
    id: "systemic",
    label: "Head / Body",
    icon: "H",
    symptoms: [
      { key: "sx_fatigue", label: "Fatigue" },
      { key: "sx_headache", label: "Headache" },
      { key: "sx_brain_fog", label: "Brain fog" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Timing / context options                                            */
/* ------------------------------------------------------------------ */

export const TIMING_OPTIONS: { value: SymptomPeakTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Midday" },
  { value: "evening", label: "Evening" },
  { value: "all_day", label: "All day" },
];

/* ------------------------------------------------------------------ */
/* Form data                                                           */
/* ------------------------------------------------------------------ */

export interface CheckinFormData {
  /** Overall severity: 0 (none), 1 (mild), 2 (moderate), 3 (severe) */
  severity: number;
  /** Individual symptom checkboxes keyed by sx_* column name */
  symptoms: Record<string, boolean>;
  /** When symptoms peak */
  symptom_peak_time: SymptomPeakTime;
  /** Whether user was mostly indoors */
  mostly_indoors: boolean;
}

export const INITIAL_CHECKIN_DATA: CheckinFormData = {
  severity: 0,
  symptoms: {},
  symptom_peak_time: "all_day",
  mostly_indoors: false,
};

/* ------------------------------------------------------------------ */
/* Severity levels                                                     */
/* ------------------------------------------------------------------ */

export const SEVERITY_LEVELS = [
  { value: 0, label: "None", description: "No symptoms today", color: "#22c55e" },
  { value: 1, label: "Mild", description: "Minor, barely noticeable", color: "#eab308" },
  { value: 2, label: "Moderate", description: "Noticeable, somewhat bothersome", color: "#f97316" },
  { value: 3, label: "Severe", description: "Significant impact on daily activities", color: "#ef4444" },
] as const;

/* ------------------------------------------------------------------ */
/* API types                                                           */
/* ------------------------------------------------------------------ */

export interface CheckinRequest {
  severity: number;
  symptoms: Record<string, boolean>;
  symptom_peak_time: SymptomPeakTime;
  mostly_indoors: boolean;
}

export interface CheckinResponse {
  success: true;
  checkin_id: string;
  trigger_champion: string | null;
  final_four: string[];
}

export interface CheckinErrorResponse {
  success: false;
  error: string;
}
