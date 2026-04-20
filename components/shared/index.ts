/**
 * Shared Components
 *
 * Re-exports for shared layout, navigation, and regulatory components.
 */

export {
  FdaDisclaimer,
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "./fda-disclaimer";
export type { FdaDisclaimerProps, FdaDisclaimerVariant } from "./fda-disclaimer";

export { DisclaimerModal } from "./disclaimer-modal";
export type { DisclaimerModalProps } from "./disclaimer-modal";

export { LockIcon } from "./lock-icon";
export type { LockIconProps } from "./lock-icon";

export { ConfidenceBadge } from "./confidence-badge";
export type {
  ConfidenceBadgeProps,
  ConfidenceBadgeVariant,
} from "./confidence-badge";

export { RevealGate } from "./reveal-gate";
export type { RevealGateProps } from "./reveal-gate";
