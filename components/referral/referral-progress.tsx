/**
 * Referral Progress Tracker
 *
 * Displays the user's referral progress toward the 3-friend unlock threshold.
 * Shows a visual progress bar and count (e.g., "2 of 3 friends invited").
 *
 * Uses dual styling (Tailwind + inline) per project convention.
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
        className={`rounded-lg border border-green-200 bg-green-50 p-4 ${className}`.trim()}
        style={{
          borderRadius: "0.5rem",
          border: "1px solid #bbf7d0",
          backgroundColor: "#f0fdf4",
          padding: "1rem",
        }}
      >
        <p
          className="text-sm font-semibold text-green-800"
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#166534",
            margin: 0,
          }}
        >
          All features unlocked!
        </p>
        <p
          className="mt-1 text-xs text-green-600"
          style={{
            fontSize: "0.75rem",
            color: "#16a34a",
            marginTop: "0.25rem",
          }}
        >
          Thank you for sharing Allergy Madness with {referralCount} friend
          {referralCount !== 1 ? "s" : ""}. Your premium features are permanently active.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="referral-progress"
      className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`.trim()}
      style={{
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: "1rem",
      }}
    >
      <p
        className="text-sm font-semibold text-gray-800"
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#1f2937",
          margin: 0,
        }}
      >
        {progress} of {REFERRAL_UNLOCK_THRESHOLD} friends invited
      </p>
      <p
        className="mt-1 text-xs text-gray-500"
        style={{
          fontSize: "0.75rem",
          color: "#6b7280",
          marginTop: "0.25rem",
        }}
      >
        Invite {REFERRAL_UNLOCK_THRESHOLD - progress} more friend
        {REFERRAL_UNLOCK_THRESHOLD - progress !== 1 ? "s" : ""} to unlock all features
      </p>

      {/* Progress bar */}
      <div
        className="mt-3 h-2 w-full rounded-full bg-gray-100"
        style={{
          marginTop: "0.75rem",
          height: "0.5rem",
          width: "100%",
          borderRadius: "9999px",
          backgroundColor: "#f3f4f6",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={REFERRAL_UNLOCK_THRESHOLD}
        aria-label={`${progress} of ${REFERRAL_UNLOCK_THRESHOLD} referrals`}
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{
            height: "100%",
            borderRadius: "9999px",
            backgroundColor: "#6366f1",
            width: `${progressPercent}%`,
            transition: "width 300ms ease",
          }}
        />
      </div>

      {/* Step indicators */}
      <div
        className="mt-2 flex justify-between"
        style={{
          marginTop: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {Array.from({ length: REFERRAL_UNLOCK_THRESHOLD }, (_, i) => (
          <div
            key={i}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              i < progress
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-400"
            }`}
            style={{
              display: "flex",
              height: "1.5rem",
              width: "1.5rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 500,
              backgroundColor: i < progress ? "#6366f1" : "#f3f4f6",
              color: i < progress ? "#ffffff" : "#9ca3af",
            }}
          >
            {i < progress ? "\u2713" : i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
