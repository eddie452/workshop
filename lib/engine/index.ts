/**
 * Tournament Engine — Public API
 *
 * Server-side only — never import from client components.
 * API keys would leak if this module were bundled for the browser.
 */

// Types
export type {
  Allergen,
  AllergenElo,
  EloUpdate,
  Severity,
  SeasonalEntry,
  SeasonalMultiplierResult,
  SymptomZone,
  SymptomInput,
  SymptomMultiplierResult,
  ConfidenceTier,
  ConfidenceResult,
} from "./types";

export {
  ELO_MIN,
  ELO_MAX,
  ELO_CENTER,
  SEASONAL_MULTIPLIER,
} from "./types";

// Elo scoring
export {
  calculatePriorProbability,
  initializeElo,
  initializeAllElo,
  calculateKFactor,
  updateElo,
  clampElo,
} from "./elo";

// Seasonal calendar
export {
  getSeasonalMultiplier,
  getSeasonalSeverity,
  getAllSeasonalMultipliers,
  isAllergenActive,
} from "./seasonal";

// Symptom specificity
export {
  checkSymptomGate,
  calculateSymptomMultiplier,
  getAllSymptomMultipliers,
} from "./symptoms";

// Confidence tiers
export {
  getConfidenceTier,
  getAllConfidenceTiers,
  getConfidenceLabel,
} from "./confidence";
