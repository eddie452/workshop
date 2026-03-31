/**
 * Referral Code Generation
 *
 * Generates unique, human-readable referral codes.
 * Codes use uppercase alphanumeric characters with ambiguous characters
 * removed (no 0/O, 1/I/L) for easy sharing.
 */

import { REFERRAL_CODE_LENGTH, REFERRAL_CODE_CHARS } from "./constants";

/**
 * Generate a random referral code.
 *
 * @returns An 8-character alphanumeric code (e.g., "X7KP3RVN")
 */
export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * REFERRAL_CODE_CHARS.length);
    code += REFERRAL_CODE_CHARS[randomIndex];
  }
  return code;
}

/**
 * Validate that a string looks like a valid referral code.
 *
 * @param code - The code to validate
 * @returns true if the code has valid format
 */
export function isValidReferralCodeFormat(code: string): boolean {
  if (!code || code.length !== REFERRAL_CODE_LENGTH) return false;
  const validChars = new RegExp(`^[${REFERRAL_CODE_CHARS}]+$`);
  return validChars.test(code);
}

/**
 * Build a referral link URL from an origin and code.
 *
 * IMPORTANT: Never hardcode the origin — always use window.location.origin
 * (client-side) or request headers (server-side).
 *
 * @param origin - The application origin (e.g., "https://example.com")
 * @param code - The referral code
 * @returns Full referral URL (e.g., "https://example.com/join?ref=X7KP3RVN")
 */
export function buildReferralLink(origin: string, code: string): string {
  return `${origin}/join?ref=${encodeURIComponent(code)}`;
}
