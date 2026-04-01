/**
 * Referral Progress Tracker
 *
 * Displays the user's referral progress toward the 3-friend unlock threshold.
 * Shows a visual progress bar and count (e.g., "2 of 3 friends invited").
 */

import { REFERRAL_UNLOCK_THRESHOLD } from "@/lib/referral/constants";

export interface ReferralProgressProps {
  /** Number of successful referrals */
  referralCount: number;
  /** Whether features are already unlocked */
  featuresUnlocked: boolean;
  /** Additional CSS class names */
  className?: string;
}

export function ReferralProgress({
  referralCount,
  featuresUnlocked,
  className = "",
}: ReferralProgressProps) {
  const progress = Math.min(referralCount, REFERRAL_UNLOCK_THRESHOLD);
  const progressPercent = (progress / REFERRAL_UNLOCK_THRESHOLD) * 100;

  if (featuresUnlocked) {
    return (
      <div
        data-testid="referral-progress"
        className={`rounded-lg border border-brand-border bg-brand-primary-light p-4 ${className}`.trim()}
      >
        <p className="text-sm font-semibold text-brand-primary-dark">
          All features unlocked!
        </p>
        <p className="mt-1 text-xs text-brand-text-secondary">
          Thank you for sharing Allergy Madness with {referralCount} friend
          {referralCount !== 1 ? "s" : ""}. Your premium features are permanently active.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="referral-progress"
      className={`rounded-lg border border-brand-border bg-white p-4 ${className}`.trim()}
    >
      <p className="text-sm font-semibold text-brand-text">
        {progress} of {REFERRAL_UNLOCK_THRESHOLD} friends invited
      </p>
      <p className="mt-1 text-xs text-brand-text-muted">
        Invite {REFERRAL_UNLOCK_THRESHOLD - progress} more friend
        {REFERRAL_UNLOCK_THRESHOLD - progress !== 1 ? "s" : ""} to unlock all features
      </p>

      {/* Progress bar */}
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-surface-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={REFERRAL_UNLOCK_THRESHOLD}
        aria-label={`${progress} of ${REFERRAL_UNLOCK_THRESHOLD} referrals`}
      >
        <div
          className="h-full rounded-full bg-brand-primary-dark transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="mt-2 flex justify-between">
        {Array.from({ length: REFERRAL_UNLOCK_THRESHOLD }, (_, i) => (
          <div
            key={i}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              i < progress
                ? "bg-brand-primary-dark text-white"
                : "bg-brand-surface-muted text-brand-text-faint"
            }`}
          >
            {i < progress ? "\u2713" : i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
