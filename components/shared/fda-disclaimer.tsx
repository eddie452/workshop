/**
 * FDA Disclaimer Banner
 *
 * Persistent, non-dismissible label required on EVERY consumer-facing
 * surface that shows ranked allergens (leaderboard, PDF report, share cards).
 *
 * Regulatory requirement — see docs/PRODUCT-REQUIREMENTS.md.
 *
 * Usage:
 *   <FdaDisclaimer />                  — default inline banner
 *   <FdaDisclaimer variant="compact" /> — single-line for tight layouts
 */

export type FdaDisclaimerVariant = "banner" | "compact";

export interface FdaDisclaimerProps {
  /** Display variant: "banner" (default) or "compact" */
  variant?: FdaDisclaimerVariant;
  /** Additional CSS class names */
  className?: string;
}

/**
 * The exact regulatory label text.
 * Exported for reuse in PDF generation, share cards, etc.
 */
export const FDA_DISCLAIMER_LABEL = "Predicted Triggers \u2014 Not a Diagnosis";

/**
 * Full FDA disclaimer body text for the acknowledgment modal.
 * Exported so it can be reused in PDF footers and legal pages.
 */
export const FDA_DISCLAIMER_FULL_TEXT =
  "Allergy Madness is a wellness screening and predictive information tool. " +
  "It is NOT an FDA-approved diagnostic test, medical device, or clinical " +
  "diagnostic system. Allergy Madness does not diagnose, treat, cure, or " +
  "prevent any disease or medical condition. All users should consult a " +
  "licensed medical provider before making any changes to medication, diet, " +
  "or lifestyle based on information provided by this application.";

/**
 * Persistent FDA disclaimer banner.
 *
 * This component is intentionally NOT dismissible — the label must
 * remain visible at all times on surfaces showing ranked allergens.
 */
export function FdaDisclaimer({
  variant = "banner",
  className = "",
}: FdaDisclaimerProps) {
  if (variant === "compact") {
    return (
      <p
        role="status"
        aria-label="FDA disclaimer"
        data-testid="fda-disclaimer"
        className={`text-xs font-medium text-amber-700 ${className}`.trim()}
      >
        {FDA_DISCLAIMER_LABEL}
      </p>
    );
  }

  return (
    <div
      role="status"
      aria-label="FDA disclaimer"
      data-testid="fda-disclaimer"
      className={`rounded-md border border-amber-200 bg-amber-50 px-4 py-3 ${className}`.trim()}
    >
      <p className="text-sm font-semibold text-amber-800">
        {FDA_DISCLAIMER_LABEL}
      </p>
      <p className="mt-1 text-xs text-amber-700">
        {FDA_DISCLAIMER_FULL_TEXT}
      </p>
    </div>
  );
}
