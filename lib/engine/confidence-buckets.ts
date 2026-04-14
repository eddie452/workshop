/**
 * Confidence Buckets
 *
 * Maps a numeric confidence score (0-1) to a high/medium/low bucket
 * with a rounded percentage and layperson-friendly copy.
 *
 * This is a display-layer helper and is safe to import from client
 * components. It is intentionally separate from the Elo-based tier
 * mapping in `./confidence.ts` (which uses low/medium/high/very_high
 * tiers derived from Elo scores).
 *
 * Bucket thresholds:
 *   high   : pct >= 75
 *   medium : 50 <= pct < 75
 *   low    : pct < 50
 */

export type ConfidenceBucket = "high" | "medium" | "low";

export interface ConfidenceInfo {
  /** Rounded percentage string, e.g. "87%". */
  percent: string;
  /** Bucket classification. */
  bucket: ConfidenceBucket;
  /** Human-readable label, e.g. "High Confidence". */
  label: string;
  /** Short layperson tagline for the bucket. */
  tagline: string;
}

/**
 * Map a confidence score (0-1) to display metadata.
 *
 * @param score — confidence in the range [0, 1]
 * @returns ConfidenceInfo with percent, bucket, label, and tagline
 */
export function getConfidenceInfo(score: number): ConfidenceInfo {
  const pct = Math.round(score * 100);

  let bucket: ConfidenceBucket;
  let label: string;
  let tagline: string;

  if (pct >= 75) {
    bucket = "high";
    label = "High Confidence";
    tagline = "We're highly confident this is a trigger.";
  } else if (pct >= 50) {
    bucket = "medium";
    label = "Medium Confidence";
    tagline = "This looks likely — keep tracking to confirm.";
  } else {
    bucket = "low";
    label = "Low Confidence";
    tagline = "Too early to tell. More check-ins will sharpen the picture.";
  }

  return { percent: `${pct}%`, bucket, label, tagline };
}
