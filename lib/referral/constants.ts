/**
 * Referral System Constants
 *
 * Centralized configuration for the 3-friend referral unlock mechanism.
 */

/** Number of successful referrals required to unlock all features */
export const REFERRAL_UNLOCK_THRESHOLD = 3;

/** Length of the generated referral code (characters) */
export const REFERRAL_CODE_LENGTH = 8;

/** Characters used in referral code generation (alphanumeric, no ambiguous chars) */
export const REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
