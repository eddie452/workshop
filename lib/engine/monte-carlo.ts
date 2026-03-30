/**
 * Monte Carlo Exposure Simulation
 *
 * Models allergen exposure probability using Stokes' Law settling
 * velocity, live weather data, and pollen concentration. Runs N=1000
 * simulations per allergen to produce a confidence-weighted exposure score.
 *
 * Server-side only — never import from client components.
 *
 * Key physics:
 * - Stokes' Law: larger particles settle faster → less airborne exposure
 * - Wind speed increases dispersion → higher exposure for outdoor allergens
 * - Humidity affects particle behavior → high humidity clumps pollen
 * - Rain washes particles out → reduces exposure
 * - Thunderstorms rupture pollen → increases SPP exposure (thunderstorm asthma)
 */

import type { WeatherResult } from "@/lib/apis/weather";
import type { PollenResult } from "@/lib/apis/pollen";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Allergen data needed for Monte Carlo simulation */
export interface MCAllergenInput {
  allergen_id: string;
  /** Mean particle size in micrometers */
  particle_size_um: number;
  /** Stokes' Law settling velocity in cm/s */
  settling_velocity_cm_s: number;
  /** Whether this allergen produces sub-pollen particles */
  spp_producer: boolean;
  /** Allergen category for pollen UPI matching */
  category: string;
}

/** Result of Monte Carlo simulation for a single allergen */
export interface MCResult {
  allergen_id: string;
  /** Mean exposure score across all simulations (0-1) */
  exposure_score: number;
  /** Standard deviation of exposure across simulations */
  exposure_std: number;
  /** Fraction of simulations where exposure exceeded threshold */
  exceedance_rate: number;
  /** MC confidence boost multiplier (1.0-2.0) */
  confidence_boost: number;
  /** Number of simulations run */
  n_simulations: number;
}

/** Environmental conditions for the simulation */
export interface MCEnvironment {
  /** Weather data from OpenWeatherMap (null fields use defaults) */
  weather: WeatherResult;
  /** Pollen data from Google Pollen API (null fields use defaults) */
  pollen: PollenResult;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Number of Monte Carlo simulations per allergen */
export const MC_N_SIMULATIONS = 1000;

/** Exposure threshold — fraction of sims above this = exceedance */
export const MC_EXPOSURE_THRESHOLD = 0.5;

/** Default weather values when API data is missing */
export const MC_WEATHER_DEFAULTS = {
  wind_mph: 5.0,
  humidity_pct: 50,
  temp_f: 72,
  rain: false,
  thunderstorm: false,
};

/** Default pollen UPI when API data is missing */
export const MC_POLLEN_DEFAULT_UPI = 2.0;

/** Maximum confidence boost from MC simulation */
export const MC_MAX_CONFIDENCE_BOOST = 2.0;

/** Minimum confidence boost (no effect) */
export const MC_MIN_CONFIDENCE_BOOST = 1.0;

/* ------------------------------------------------------------------ */
/* Seeded RNG                                                          */
/* ------------------------------------------------------------------ */

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences for reproducible simulations.
 *
 * @param seed — integer seed value
 * @returns function that returns next random number in [0, 1)
 */
export function createSeededRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Physics Helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Calculate wind dispersion factor.
 * Higher wind speed = more dispersion = higher exposure for outdoor allergens.
 * Normalized to 0-1 range with diminishing returns above 20 mph.
 */
export function windDispersionFactor(wind_mph: number): number {
  // Sigmoid-like curve: low wind = low exposure, plateaus at high wind
  return Math.min(1.0, wind_mph / 20.0);
}

/**
 * Calculate settling factor based on Stokes' Law.
 * Smaller particles stay airborne longer = higher exposure.
 * settling_velocity_cm_s is inversely related to airborne time.
 *
 * @param settling_velocity_cm_s — Stokes' Law terminal velocity
 * @returns factor 0-1 (higher = more airborne time = more exposure)
 */
export function settlingFactor(settling_velocity_cm_s: number): number {
  // Invert: slower settling = more time airborne = higher exposure
  // Reference range: 0.1 cm/s (mold spores) to 10 cm/s (heavy pollen)
  // Using exponential decay: f = e^(-v/3) gives good spread
  return Math.exp(-settling_velocity_cm_s / 3.0);
}

/**
 * Calculate humidity factor.
 * High humidity causes pollen clumping → reduces airborne concentration
 * but can also cause mold growth → context-dependent.
 * We model a U-curve: moderate humidity is lowest exposure.
 */
export function humidityFactor(humidity_pct: number): number {
  // Normalize 0-100 to 0-1
  const h = humidity_pct / 100;
  // Moderate humidity (40-60%) = lowest factor
  // Very low (<20%) = dry, particles stay airborne
  // Very high (>80%) = mold thrives, particles clump but exposure via water
  return 0.5 + 0.5 * Math.abs(h - 0.5);
}

/**
 * Calculate rain washout factor.
 * Rain reduces airborne allergens significantly.
 */
export function rainWashoutFactor(isRaining: boolean): number {
  return isRaining ? 0.3 : 1.0;
}

/**
 * Calculate thunderstorm asthma factor.
 * Thunderstorms rupture pollen grains into sub-pollen particles (SPP)
 * that are small enough to penetrate deep into airways.
 * Only affects SPP-producing allergens.
 */
export function thunderstormFactor(
  isThunderstorm: boolean,
  spp_producer: boolean,
): number {
  if (isThunderstorm && spp_producer) return 2.5;
  if (isThunderstorm) return 0.7; // rain effect without SPP boost
  return 1.0;
}

/**
 * Get pollen UPI for an allergen category from API data.
 * Maps category to the appropriate UPI field.
 */
export function getPollenUpi(
  pollen: PollenResult,
  category: string,
): number {
  switch (category) {
    case "tree":
      return pollen.upi_tree ?? MC_POLLEN_DEFAULT_UPI;
    case "grass":
      return pollen.upi_grass ?? MC_POLLEN_DEFAULT_UPI;
    case "weed":
      return pollen.upi_weed ?? MC_POLLEN_DEFAULT_UPI;
    default:
      // Indoor, mold, food — not directly in pollen API
      return MC_POLLEN_DEFAULT_UPI;
  }
}

/**
 * Normalize UPI (0-5 scale) to a concentration factor (0-1).
 */
export function upiToConcentration(upi: number): number {
  return Math.min(1.0, upi / 5.0);
}

/* ------------------------------------------------------------------ */
/* Single Simulation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Run a single Monte Carlo exposure simulation.
 *
 * Combines environmental factors with random noise to model
 * one possible exposure outcome.
 *
 * @returns exposure value 0-1
 */
export function simulateExposure(
  allergen: MCAllergenInput,
  wind: number,
  humidity: number,
  rain: boolean,
  thunderstorm: boolean,
  pollenConcentration: number,
  random: () => number,
): number {
  // Base factors
  const windFactor = windDispersionFactor(wind);
  const settleFactor = settlingFactor(allergen.settling_velocity_cm_s);
  const humidFactor = humidityFactor(humidity);
  const rainFactor = rainWashoutFactor(rain);
  const tsFactor = thunderstormFactor(thunderstorm, allergen.spp_producer);

  // Combine deterministic factors
  const base =
    pollenConcentration *
    windFactor *
    settleFactor *
    humidFactor *
    rainFactor *
    tsFactor;

  // Add stochastic noise (±30% of base)
  const noise = 1.0 + (random() - 0.5) * 0.6;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, base * noise));
}

/* ------------------------------------------------------------------ */
/* Monte Carlo Runner                                                  */
/* ------------------------------------------------------------------ */

/**
 * Run Monte Carlo simulation for a single allergen.
 *
 * @param allergen — allergen-specific physical properties
 * @param env — environmental conditions (weather + pollen)
 * @param seed — RNG seed for reproducibility (optional)
 * @param nSims — number of simulations (default: MC_N_SIMULATIONS)
 * @returns MCResult with exposure statistics
 */
export function runMonteCarloForAllergen(
  allergen: MCAllergenInput,
  env: MCEnvironment,
  seed?: number,
  nSims: number = MC_N_SIMULATIONS,
): MCResult {
  const random = seed != null ? createSeededRng(seed) : Math.random;

  // Resolve weather values with defaults
  const wind = env.weather.wind_mph ?? MC_WEATHER_DEFAULTS.wind_mph;
  const humidity =
    env.weather.humidity_pct ?? MC_WEATHER_DEFAULTS.humidity_pct;
  const rain = env.weather.rain_last_12h;
  const thunderstorm = env.weather.thunderstorm_6h;

  // Get pollen concentration for this allergen's category
  const upi = getPollenUpi(env.pollen, allergen.category);
  const concentration = upiToConcentration(upi);

  // Run simulations
  let sum = 0;
  let sumSq = 0;
  let exceedCount = 0;

  for (let i = 0; i < nSims; i++) {
    const exposure = simulateExposure(
      allergen,
      wind,
      humidity,
      rain,
      thunderstorm,
      concentration,
      random,
    );

    sum += exposure;
    sumSq += exposure * exposure;
    if (exposure > MC_EXPOSURE_THRESHOLD) exceedCount++;
  }

  const mean = sum / nSims;
  const variance = sumSq / nSims - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));
  const exceedanceRate = exceedCount / nSims;

  // Calculate confidence boost: higher exposure + higher exceedance = bigger boost
  // Scale from 1.0 (no boost) to 2.0 (max boost)
  const confidenceBoost = Math.min(
    MC_MAX_CONFIDENCE_BOOST,
    MC_MIN_CONFIDENCE_BOOST + mean * exceedanceRate,
  );

  return {
    allergen_id: allergen.allergen_id,
    exposure_score: Math.round(mean * 10000) / 10000,
    exposure_std: Math.round(std * 10000) / 10000,
    exceedance_rate: Math.round(exceedanceRate * 10000) / 10000,
    confidence_boost: Math.round(confidenceBoost * 10000) / 10000,
    n_simulations: nSims,
  };
}

/**
 * Run Monte Carlo simulation for all allergens.
 *
 * @param allergens — array of allergen inputs
 * @param env — environmental conditions
 * @param baseSeed — base RNG seed (each allergen gets baseSeed + index)
 * @returns array of MCResult, one per allergen
 */
export function runMonteCarloForAll(
  allergens: MCAllergenInput[],
  env: MCEnvironment,
  baseSeed?: number,
): MCResult[] {
  return allergens.map((allergen, index) =>
    runMonteCarloForAllergen(
      allergen,
      env,
      baseSeed != null ? baseSeed + index : undefined,
    ),
  );
}
