/**
 * Shared ConfidenceBadge — numeric-score variant.
 *
 * This is the canonical confidence UI per ticket #156. It consumes a
 * numeric score (0-1) from the engine. When the engine begins emitting
 * numeric confidence on RankedAllergen, this replaces
 * components/leaderboard/confidence-badge.tsx (tier-string variant).
 *
 * Migration is tracked in issue #160.
 *
 * Displays a numeric confidence score (0-1) as a rounded percentage
 * with a layperson label. Uses the Nature Pop accent color for the
 * percent / bar fill only; labels use brand-text-secondary for AA
 * compliance.
 *
 * When `score` is null or undefined, the component renders nothing
 * (returns null) — call sites should pass the real value from the
 * engine, or null when no numeric confidence is available.
 *
 * Bucket intensity (no red/green — Nature Pop opacity tiers):
 *   high   : text-brand-accent
 *   medium : text-brand-accent/75
 *   low    : text-brand-accent/50
 *
 * Variants:
 *   compact : percent + label (default, readable at 12px)
 *   full    : percent + label + tagline
 *   bar     : horizontal progress bar filled to percent
 */

import {
  getConfidenceInfo,
  type ConfidenceBucket,
} from "@/lib/engine/confidence-buckets";

export type ConfidenceBadgeVariant = "compact" | "full" | "bar";

export interface ConfidenceBadgeProps {
  /**
   * Confidence score in the range [0, 1], or null/undefined when no
   * numeric confidence is available. When null/undefined, the
   * component renders nothing.
   */
  score: number | null | undefined;
  /** Display variant. Defaults to "compact". */
  variant?: ConfidenceBadgeVariant;
}

const BUCKET_SPOKEN: Record<ConfidenceBucket, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

const PERCENT_INTENSITY: Record<ConfidenceBucket, string> = {
  high: "text-brand-accent",
  medium: "text-brand-accent/75",
  low: "text-brand-accent/50",
};

export function ConfidenceBadge({
  score,
  variant = "compact",
}: ConfidenceBadgeProps) {
  // Render nothing when no numeric score is available. Call sites
  // should pass null until the engine emits numeric confidence.
  if (score === null || score === undefined) {
    return null;
  }

  const info = getConfidenceInfo(score);
  const ariaLabel = `${parseInt(info.percent, 10)} percent confidence, ${BUCKET_SPOKEN[info.bucket]}`;

  if (variant === "bar") {
    return (
      <div
        data-testid="shared-confidence-badge"
        data-variant="bar"
        data-bucket={info.bucket}
        aria-label={ariaLabel}
        role="img"
        className="relative h-5 w-full overflow-hidden rounded-full bg-brand-primary-dark/20"
      >
        <div
          data-testid="confidence-bar-fill"
          className="h-full bg-brand-accent transition-[width] duration-300"
          style={{ width: info.percent }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-brand-primary-dark">
          {info.percent}
        </span>
      </div>
    );
  }

  const percentClass =
    info.bucket === "high"
      ? "text-base font-bold leading-none"
      : "text-sm font-semibold leading-none";

  if (variant === "full") {
    return (
      <div
        data-testid="shared-confidence-badge"
        data-variant="full"
        data-bucket={info.bucket}
        aria-label={ariaLabel}
        className="flex flex-col gap-0.5"
      >
        <span className={`${percentClass} ${PERCENT_INTENSITY[info.bucket]}`}>
          {info.percent}
        </span>
        <span className="text-xs font-medium text-brand-text-secondary">
          {info.label}
        </span>
        <span className="text-xs text-brand-text-secondary">
          {info.tagline}
        </span>
      </div>
    );
  }

  // compact
  return (
    <span
      data-testid="shared-confidence-badge"
      data-variant="compact"
      data-bucket={info.bucket}
      aria-label={ariaLabel}
      className="inline-flex flex-col items-start leading-tight"
    >
      <span className={`${percentClass} ${PERCENT_INTENSITY[info.bucket]}`}>
        {info.percent}
      </span>
      <span className="text-[10px] font-medium text-brand-text-secondary">
        {info.label}
      </span>
    </span>
  );
}
