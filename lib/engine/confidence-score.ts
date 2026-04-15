/**
 * Numeric Confidence Score (0–1) — Two-Layer Model (issue #193)
 *
 * The original single-layer function (`getConfidenceScoreBySignals`)
 * is a piecewise-linear curve over **total signal count** (positive
 * + negative check-ins). That metric answers "how much data do we
 * have?" — not "which allergen is most likely the trigger?" — so
 * every allergen in a user's account ends up with roughly the same
 * score (the ~21% flat-line bug surfaced in #193).
 *
 * This module replaces that single output with two layers:
 *
 *   1. Discriminative layer (sync, cheap) — `getDiscriminativeConfidence`
 *      Elo-separation sigmoid. By construction #1 scores high, #43
 *      scores low. Pure, deterministic, no randomness.
 *
 *   2. Epistemic layer (Monte Carlo) — `getPosteriorConfidence`
 *      Re-runs the pairwise tournament N times with bounded noise
 *      injected per-allergen; posterior = fraction of runs in which
 *      each allergen finished in the top K. Deterministic under
 *      seed. Drives the `ConfidenceTier` string.
 *
 * Tier thresholds stay at the same observable cutoffs (Low < 0.5,
 * Medium ≥ 0.5, High ≥ 0.75, Very High ≥ 0.9) — but now operate on
 * the posterior rather than signal count.
 *
 * Server-side only (lives under `lib/engine/`). Pure and has no
 * secret dependencies — safe to import from API routes and server
 * components.
 */

import type { ConfidenceTier, TournamentEntry } from "./types";
import { pairwiseSort } from "./tournament";
import { createSeededRng } from "./monte-carlo";

/* ------------------------------------------------------------------ */
/* Legacy signal-count curve (kept for migration / back-compat)        */
/* ------------------------------------------------------------------ */

/** Anchor points for the piecewise-linear score curve. Must be sorted by signals asc. */
const SCORE_ANCHORS: { signals: number; score: number }[] = [
  { signals: 0, score: 0 },
  { signals: 7, score: 0.5 },
  { signals: 14, score: 0.75 },
  { signals: 30, score: 0.9 },
  { signals: 50, score: 1.0 },
];

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Compute a 0–1 confidence score from a total signal count.
 *
 * @deprecated Since issue #193: signal count is an epistemic
 *   (how much data) metric, not a discriminative (which allergen)
 *   metric, so every allergen lands at roughly the same value.
 *   Prefer `getDiscriminativeConfidence` for per-allergen separation
 *   and `getPosteriorConfidence` for the tier-driving probability.
 *   Kept exported through at least one release to avoid breaking
 *   callers (see `app/api/leaderboard/route.ts`).
 *
 * @param totalSignals — sum of positive + negative check-in signals
 * @returns score in [0, 1], clamped
 */
export function getConfidenceScoreBySignals(totalSignals: number): number {
  // Defensive: NaN -> 0, negative -> 0 (can't have negative signal count),
  // +Infinity -> saturated 1.0 (asymptote).
  if (Number.isNaN(totalSignals)) return 0;
  if (totalSignals <= 0) return 0;
  if (!Number.isFinite(totalSignals)) return 1;

  // Find the bracketing anchor pair.
  for (let i = 0; i < SCORE_ANCHORS.length - 1; i++) {
    const lo = SCORE_ANCHORS[i];
    const hi = SCORE_ANCHORS[i + 1];
    if (totalSignals >= lo.signals && totalSignals < hi.signals) {
      const t = (totalSignals - lo.signals) / (hi.signals - lo.signals);
      return clamp(lo.score + t * (hi.score - lo.score), 0, 1);
    }
  }

  // At or beyond the final anchor — asymptote to 1.0.
  return 1;
}

/* ------------------------------------------------------------------ */
/* Layer 1 — Discriminative (Elo separation)                           */
/* ------------------------------------------------------------------ */

/**
 * Sigmoid steepness for Elo separation. Calibrated so that a 200-Elo
 * gap (one tier) maps close to the 0.75 discriminative boundary,
 * matching the tier math in `./confidence.ts`.
 */
export const DISCRIMINATIVE_SIGMOID_K = 1 / 200;

/** Numerically-safe logistic sigmoid. */
function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/**
 * Compute the discriminative confidence score for a single allergen
 * given its Elo and a set of reference neighbors.
 *
 * The score is `sigmoid(k * (elo - reference))` where `reference`
 * is the median Elo of the provided neighbors (or of a single-
 * element reference). By construction:
 *
 *   - An allergen with Elo well above the reference → ~1.0
 *   - An allergen with Elo well below the reference → ~0.0
 *   - An allergen exactly at the reference → 0.5
 *
 * This guarantees that for any leaderboard with ≥ 2 distinct Elo
 * values, `rank_1.discriminative !== rank_last.discriminative` —
 * the core DoD criterion for #193.
 *
 * Pure and deterministic: no randomness, no I/O.
 *
 * @param elo — the allergen's Elo score
 * @param neighbors — the reference pool (e.g. all leaderboard Elos).
 *   If empty, defaults to a neutral reference of `elo` (returns 0.5).
 * @param k — sigmoid steepness. Default `DISCRIMINATIVE_SIGMOID_K`.
 * @returns discriminative score in [0, 1]
 */
export function getDiscriminativeConfidence(
  elo: number,
  neighbors: number[],
  k: number = DISCRIMINATIVE_SIGMOID_K,
): number {
  if (!Number.isFinite(elo)) return 0;
  const reference =
    neighbors.length > 0 ? medianOf(neighbors) : elo;
  const delta = elo - reference;
  return clamp(sigmoid(k * delta), 0, 1);
}

/** Median of a numeric array. Non-mutating. */
function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/* ------------------------------------------------------------------ */
/* Layer 2 — Posterior (Monte Carlo top-K frequency)                   */
/* ------------------------------------------------------------------ */

/**
 * Options for the posterior-confidence Monte Carlo runner.
 */
export interface PosteriorConfidenceOptions {
  /** Number of Monte Carlo runs. Default 200. */
  runs?: number;
  /** RNG seed for reproducibility. Default 0 (deterministic). */
  seed?: number;
  /**
   * Top-K threshold — posterior is the fraction of runs in which
   * the allergen finishes at rank ≤ `topK`. Default 4 (Final Four).
   */
  topK?: number;
  /**
   * Bounded uniform noise magnitude applied to each allergen's
   * composite score per run, as a fraction of `NOISE_BASE` (so the
   * per-run noise is drawn from `±noise * NOISE_BASE`). Default 0.25.
   * Must be ≥ 0.
   */
  noise?: number;
}

/** Base noise magnitude (Elo points) used by the Monte Carlo layer. */
export const POSTERIOR_NOISE_BASE = 100;

/** Default number of Monte Carlo runs. */
export const POSTERIOR_DEFAULT_RUNS = 200;

/** Default top-K threshold (Final Four). */
export const POSTERIOR_DEFAULT_TOP_K = 4;

/** Default noise fraction applied per run. */
export const POSTERIOR_DEFAULT_NOISE = 0.25;

/**
 * Compute the posterior confidence for every allergen on a
 * leaderboard via seeded Monte Carlo resampling of the pairwise
 * tournament.
 *
 * For each of `runs` iterations we perturb every entry's
 * `composite_score` by a bounded uniform draw in
 * `±noise * POSTERIOR_NOISE_BASE` and re-sort with the existing
 * `pairwiseSort`. We tally how often each allergen lands in the
 * top `topK`. The posterior is `tally / runs`.
 *
 * Determinism: with the same input and the same `seed`, the
 * returned map is identical.
 *
 * Degenerate inputs:
 *   - Empty leaderboard → empty map
 *   - Single allergen → `{ [allergen_id]: 1 }` (always top-K)
 *
 * @param leaderboard — tournament entries (already ranked or not;
 *   order does not matter, only composite_score does)
 * @param options — see `PosteriorConfidenceOptions`
 * @returns map from allergen_id to posterior in [0, 1]
 */
export function getPosteriorConfidence(
  leaderboard: TournamentEntry[],
  options: PosteriorConfidenceOptions = {},
): Record<string, number> {
  const runs = options.runs ?? POSTERIOR_DEFAULT_RUNS;
  const seed = options.seed ?? 0;
  const topK = options.topK ?? POSTERIOR_DEFAULT_TOP_K;
  const noise = options.noise ?? POSTERIOR_DEFAULT_NOISE;

  if (leaderboard.length === 0) return {};

  // Degenerate: a single allergen is always top-K by definition.
  if (leaderboard.length === 1) {
    return { [leaderboard[0].allergen_id]: 1 };
  }

  const tally: Record<string, number> = {};
  for (const entry of leaderboard) {
    tally[entry.allergen_id] = 0;
  }

  const rng = createSeededRng(seed);
  const noiseMagnitude = Math.max(0, noise) * POSTERIOR_NOISE_BASE;

  for (let r = 0; r < runs; r++) {
    const perturbed: TournamentEntry[] = leaderboard.map((entry) => ({
      ...entry,
      // Uniform draw in [-noiseMagnitude, +noiseMagnitude].
      composite_score:
        entry.composite_score + (rng() * 2 - 1) * noiseMagnitude,
    }));

    const sorted = pairwiseSort(perturbed);
    const topSize = Math.min(topK, sorted.length);
    for (let i = 0; i < topSize; i++) {
      tally[sorted[i].allergen_id] += 1;
    }
  }

  const posterior: Record<string, number> = {};
  for (const id of Object.keys(tally)) {
    posterior[id] = tally[id] / runs;
  }
  return posterior;
}

/* ------------------------------------------------------------------ */
/* Tier derivation from posterior                                      */
/* ------------------------------------------------------------------ */

/**
 * Map a posterior probability in [0, 1] to the canonical
 * four-level `ConfidenceTier` string. Thresholds are aligned with
 * the display-bucket cutoffs so the numeric surface and the tier
 * string stay in agreement.
 *
 *   posterior >= 0.9  → very_high
 *   posterior >= 0.75 → high
 *   posterior >= 0.5  → medium
 *   posterior <  0.5  → low
 *
 * Pure and deterministic.
 */
export function getConfidenceTierByPosterior(
  posterior: number,
): ConfidenceTier {
  if (!Number.isFinite(posterior) || posterior < 0.5) return "low";
  if (posterior >= 0.9) return "very_high";
  if (posterior >= 0.75) return "high";
  return "medium";
}
