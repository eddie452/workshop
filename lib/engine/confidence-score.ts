/**
 * Numeric Confidence Score (0–1)
 *
 * Derives a deterministic confidence number in [0, 1] for a ranked
 * allergen based on the total observed signal count (positive +
 * negative check-ins). This is the numeric companion to the existing
 * tier string produced by `./confidence.ts` — both surfaces are kept
 * during the migration tracked in issue #160.
 *
 * Derivation (piecewise linear, anchored at the bucket boundaries the
 * display layer uses in `./confidence-buckets.ts`):
 *
 *     signals   -> score
 *         0     -> 0.00
 *         7     -> 0.50   (low  -> medium boundary)
 *        14     -> 0.75   (medium -> high boundary)
 *        30     -> 0.90   (very_high tier threshold)
 *        50+    -> 1.00   (asymptote, clamped)
 *
 * Rationale: the existing signal-count tiers (`getConfidenceTierBySignals`
 * — `>= 7` medium, `>= 14` high, `>= 30` very_high) are the established
 * confidence gradient in the app. Mapping those same breakpoints onto
 * the display bucket thresholds (`>= 0.5` medium, `>= 0.75` high) makes
 * the numeric score and the legacy tier agree end-to-end, so 7 signals
 * lands exactly on "medium" in both surfaces and 14 signals lands
 * exactly on "high". 50 signals is the cap where additional check-ins
 * no longer move the needle.
 *
 * Pure and deterministic — no randomness, no time dependence, no I/O.
 * Result is always clamped to [0, 1].
 *
 * Server-side only (lives under `lib/engine/`), but has no secret
 * dependencies — safe to import from API routes and server components.
 */

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
