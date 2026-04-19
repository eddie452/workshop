/**
 * Tests for `hashStringToInt32` (issue #229).
 *
 * The hash drives per-user posterior seeding on the leaderboard route.
 * It must be deterministic, small-change sensitive, and always produce
 * a valid int32 — those are the four properties exercised here.
 */

import { describe, it, expect } from "vitest";
import { hashStringToInt32 } from "@/lib/engine/hash";

const INT32_MIN = -(2 ** 31);
const INT32_MAX = 2 ** 31 - 1;

describe("hashStringToInt32", () => {
  it("is deterministic — same input produces same output", () => {
    expect(hashStringToInt32("a")).toBe(hashStringToInt32("a"));
    expect(hashStringToInt32("user-123")).toBe(hashStringToInt32("user-123"));
    expect(hashStringToInt32("")).toBe(hashStringToInt32(""));
  });

  it("is sensitive to small changes — adjacent inputs diverge", () => {
    expect(hashStringToInt32("abc")).not.toBe(hashStringToInt32("abd"));
    expect(hashStringToInt32("user-1")).not.toBe(hashStringToInt32("user-2"));
  });

  it("returns the FNV-1a offset basis (cast to int32) for the empty string", () => {
    // 0x811c9dc5 has the high bit set, so `| 0` casts it to a negative int32.
    expect(hashStringToInt32("")).toBe(0x811c9dc5 | 0);
    expect(hashStringToInt32("")).toBe(-2128831035);
  });

  it("always returns a valid int32", () => {
    const samples = [
      "",
      "a",
      "ab",
      "abc",
      "user-123",
      "00000000-0000-0000-0000-000000000000",
      "e7c9c4a2-1234-5678-9abc-def012345678",
      "\u{1F600}\u{1F4A9}",
      "a".repeat(1000),
    ];

    for (const s of samples) {
      const h = hashStringToInt32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(INT32_MIN);
      expect(h).toBeLessThanOrEqual(INT32_MAX);
    }
  });
});
