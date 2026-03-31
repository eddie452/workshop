/**
 * Rate Limiter Unit Tests
 *
 * Tests the in-memory sliding window rate limiter.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  resetAllRateLimits,
  type RateLimitConfig,
} from "@/lib/rate-limit";

const TEST_CONFIG: RateLimitConfig = {
  maxRequests: 3,
  windowMs: 60_000, // 1 minute
};

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetAllRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("test", "user-1", TEST_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("tracks remaining count correctly", () => {
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);
    const result = checkRateLimit("test", "user-1", TEST_CONFIG);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("rejects requests over the limit", () => {
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);

    const result = checkRateLimit("test", "user-1", TEST_CONFIG);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);

    // Advance past the window
    vi.advanceTimersByTime(61_000);

    const result = checkRateLimit("test", "user-1", TEST_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("isolates different keys", () => {
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);
    checkRateLimit("test", "user-1", TEST_CONFIG);

    // user-2 should still have full quota
    const result = checkRateLimit("test", "user-2", TEST_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("isolates different limiter names", () => {
    checkRateLimit("limiter-a", "user-1", TEST_CONFIG);
    checkRateLimit("limiter-a", "user-1", TEST_CONFIG);
    checkRateLimit("limiter-a", "user-1", TEST_CONFIG);

    // Same user, different limiter should have full quota
    const result = checkRateLimit("limiter-b", "user-1", TEST_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("provides valid resetAt timestamp", () => {
    const result = checkRateLimit("test", "user-1", TEST_CONFIG);
    const nowSeconds = Math.ceil(Date.now() / 1000);

    // resetAt should be roughly now + windowMs
    expect(result.resetAt).toBeGreaterThanOrEqual(nowSeconds);
    expect(result.resetAt).toBeLessThanOrEqual(
      nowSeconds + TEST_CONFIG.windowMs / 1000 + 1,
    );
  });

  it("slides the window — old requests expire individually", () => {
    // Make 3 requests, spaced 20 seconds apart
    checkRateLimit("test", "user-1", TEST_CONFIG);
    vi.advanceTimersByTime(20_000);

    checkRateLimit("test", "user-1", TEST_CONFIG);
    vi.advanceTimersByTime(20_000);

    checkRateLimit("test", "user-1", TEST_CONFIG);

    // At limit now. Advance 21 seconds — first request should expire
    vi.advanceTimersByTime(21_000);

    const result = checkRateLimit("test", "user-1", TEST_CONFIG);
    expect(result.allowed).toBe(true);
  });
});
