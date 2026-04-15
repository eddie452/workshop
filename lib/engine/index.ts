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
  CCRSInput,
  CCRSResult,
  LRTAllergenInput,
  LRTResult,
  TournamentEntry,
  TournamentResult,
  AllergenSeedData,
  RunInput,
  RunOutput,
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
  getConfidenceTierBySignals,
  getAllConfidenceTiers,
  getConfidenceLabel,
} from "./confidence";

// Confidence score — two-layer model (issue #193)
//   - getConfidenceScoreBySignals: legacy signal-count curve (deprecated)
//   - getDiscriminativeConfidence: Elo-separation sigmoid (cheap, sync)
//   - getPosteriorConfidence: Monte Carlo top-K frequency (tier driver)
//   - getConfidenceTierByPosterior: posterior → tier string
export {
  getConfidenceScoreBySignals,
  getDiscriminativeConfidence,
  getPosteriorConfidence,
  getConfidenceTierByPosterior,
  DISCRIMINATIVE_SIGMOID_K,
  POSTERIOR_NOISE_BASE,
  POSTERIOR_DEFAULT_RUNS,
  POSTERIOR_DEFAULT_TOP_K,
  POSTERIOR_DEFAULT_NOISE,
} from "./confidence-score";
export type { PosteriorConfidenceOptions } from "./confidence-score";

// Monte Carlo exposure simulation
export type {
  MCAllergenInput,
  MCResult,
  MCEnvironment,
} from "./monte-carlo";

export {
  MC_N_SIMULATIONS,
  MC_EXPOSURE_THRESHOLD,
  MC_WEATHER_DEFAULTS,
  MC_POLLEN_DEFAULT_UPI,
  MC_MAX_CONFIDENCE_BOOST,
  MC_MIN_CONFIDENCE_BOOST,
  createSeededRng,
  windDispersionFactor,
  settlingFactor,
  humidityFactor,
  rainWashoutFactor,
  thunderstormFactor,
  getPollenUpi,
  upiToConcentration,
  simulateExposure,
  runMonteCarloForAllergen,
  runMonteCarloForAll,
} from "./monte-carlo";

// CCRS gate
export {
  COCKROACH_ALLERGEN_ID,
  checkCCRSGate,
  getCCRSMultiplier,
  isCockroachAllergen,
  applyCCRSGate,
} from "./ccrs";

// Long-Range Transport
export {
  isWindFromRegion,
  detectLRT,
  detectLRTForAll,
} from "./lrt";

// Tournament sort
export {
  createTournamentEntry,
  pairwiseCompare,
  pairwiseSort,
  runTournament,
} from "./tournament";

// Trigger Scout
export type {
  ScoutAllergenSeed,
  ScoutMatch,
  ScoutConditions,
  ScoutScanResult,
} from "./trigger-scout";

export {
  TRIGGER_SCOUT_PROXIMITY_MULTIPLIER,
  matchLabelsToAllergen,
  matchLabelsToAllergens,
  analyzeScan,
} from "./trigger-scout";

// Run orchestrator
export { runTournamentPipeline } from "./run";
