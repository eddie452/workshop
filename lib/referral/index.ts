/**
 * Referral System
 *
 * Re-exports for the 3-friend referral unlock mechanism.
 */

export { REFERRAL_UNLOCK_THRESHOLD, REFERRAL_CODE_LENGTH } from "./constants";
export { generateReferralCode, isValidReferralCodeFormat, buildReferralLink } from "./code";
export { ensureReferralCode, getReferralStatus, recordReferral } from "./tracking";
export type { ReferralStatus } from "./tracking";
