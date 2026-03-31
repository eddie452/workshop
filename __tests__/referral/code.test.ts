/**
 * Referral Code Generation Tests
 *
 * Validates:
 * - Code generation produces correct length and character set
 * - Code validation rejects invalid formats
 * - Referral link building uses provided origin (never hardcoded)
 * - No health data in referral links
 */

import { describe, it, expect } from "vitest";
import {
  generateReferralCode,
  isValidReferralCodeFormat,
  buildReferralLink,
} from "@/lib/referral/code";
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_CHARS,
} from "@/lib/referral/constants";

describe("generateReferralCode", () => {
  it("returns a code of the correct length", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
  });

  it("uses only valid characters", () => {
    const code = generateReferralCode();
    for (const char of code) {
      expect(REFERRAL_CODE_CHARS).toContain(char);
    }
  });

  it("generates different codes on successive calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateReferralCode());
    }
    // With 8 chars from 32 possible, collisions in 50 tries are astronomically unlikely
    expect(codes.size).toBeGreaterThan(45);
  });

  it("does not contain ambiguous characters (0, O, 1, I)", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateReferralCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe("isValidReferralCodeFormat", () => {
  it("accepts a valid code", () => {
    expect(isValidReferralCodeFormat("X7KP3RVN")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidReferralCodeFormat("")).toBe(false);
  });

  it("rejects too-short code", () => {
    expect(isValidReferralCodeFormat("ABC")).toBe(false);
  });

  it("rejects too-long code", () => {
    expect(isValidReferralCodeFormat("ABCDEFGHIJ")).toBe(false);
  });

  it("rejects code with invalid characters", () => {
    expect(isValidReferralCodeFormat("abcd1234")).toBe(false);
  });

  it("rejects code with ambiguous characters", () => {
    // 0, O, I, 1 are excluded from REFERRAL_CODE_CHARS
    expect(isValidReferralCodeFormat("0OI1XYZQ")).toBe(false);
  });

  it("validates generated codes", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateReferralCode();
      expect(isValidReferralCodeFormat(code)).toBe(true);
    }
  });
});

describe("buildReferralLink", () => {
  it("builds link with provided origin and code", () => {
    const link = buildReferralLink("https://example.com", "X7KP3RVN");
    expect(link).toBe("https://example.com/join?ref=X7KP3RVN");
  });

  it("uses dynamic origin (not hardcoded)", () => {
    const link1 = buildReferralLink("https://app.example.com", "ABCD1234");
    const link2 = buildReferralLink("http://localhost:3000", "ABCD1234");

    expect(link1).toContain("app.example.com");
    expect(link2).toContain("localhost:3000");
    // Neither should contain a hardcoded production URL
  });

  it("encodes special characters in the code", () => {
    const link = buildReferralLink("https://example.com", "A+B/C=D");
    expect(link).toContain("ref=A%2BB%2FC%3DD");
  });

  it("contains NO health data", () => {
    const link = buildReferralLink("https://example.com", "X7KP3RVN");
    // Referral links must contain only the origin and ref code — no health info
    expect(link).toBe("https://example.com/join?ref=X7KP3RVN");
    expect(link).not.toContain("allergen");
    expect(link).not.toContain("symptom");
    expect(link).not.toContain("diagnosis");
    expect(link).not.toContain("income");
  });
});
