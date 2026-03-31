/**
 * In-memory sliding window rate limiter.
 *
 * Tracks timestamps of actions per key (e.g. user ID) and rejects
 * requests that exceed the configured limit within the window.
 *
 * Trade-offs:
 * - Resets on deploy/restart (acceptable for this use case)
 * - Not shared across server instances (fine for single-instance Render)
 * - Can be replaced with Redis/Upstash later if horizontal scaling is needed
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix timestamp (seconds) when the oldest request in the window expires */
  resetAt: number;
  /** Seconds until the caller can retry (0 if allowed) */
  retryAfterSeconds: number;
}

interface WindowEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, WindowEntry>>();

/**
 * Get or create the store for a named limiter instance.
 * Keeping separate stores lets different endpoints have independent limits.
 */
function getStore(name: string): Map<string, WindowEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

/**
 * Check and consume a rate limit token for the given key.
 *
 * @param name   - Limiter instance name (e.g. "referral-invite")
 * @param key    - Unique caller identifier (e.g. user ID)
 * @param config - Rate limit configuration
 * @returns      - Result indicating whether the request is allowed
 */
export function checkRateLimit(
  name: string,
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const store = getStore(name);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    // Oldest timestamp in the window determines when a slot frees up
    const oldestTs = entry.timestamps[0];
    const resetAt = Math.ceil((oldestTs + config.windowMs) / 1000);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestTs + config.windowMs - now) / 1000),
    );

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  const remaining = config.maxRequests - entry.timestamps.length;
  const resetAt = Math.ceil((entry.timestamps[0] + config.windowMs) / 1000);

  return {
    allowed: true,
    remaining,
    resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Clear all entries for a named limiter. Useful in tests.
 */
export function resetRateLimit(name: string): void {
  stores.delete(name);
}

/**
 * Clear all rate limit stores. Useful in tests.
 */
export function resetAllRateLimits(): void {
  stores.clear();
}
