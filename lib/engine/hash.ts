/**
 * Deterministic string-to-int32 hash (FNV-1a).
 *
 * Used to derive a per-user seed for posterior confidence Monte Carlo
 * sampling (issue #229). Keeping the hash pure and deterministic means
 * every user gets a reproducible noise sequence, while two different
 * users get decorrelated sequences — avoiding the prior behavior where
 * every user shared the hardcoded `seed: 0`.
 *
 * Non-adversarial bucketing: FNV-1a is not a cryptographic hash and
 * must not be used where collision resistance matters.
 *
 * Implementation notes:
 *   - Pure function: no randomness, no wall-clock, no I/O.
 *   - No dependencies: ~10 lines of JS.
 *   - Output is always a valid int32 in `[-2^31, 2^31 - 1]`, compatible
 *     with the downstream `seed: number` parameter on
 *     `getPosteriorConfidence`.
 *   - `Math.imul` keeps the intermediate multiplication inside int32
 *     space (JS `*` would promote to float64 and lose low bits on the
 *     FNV prime).
 */
export function hashStringToInt32(s: string): number {
  let h = 0x811c9dc5; // FNV-1a offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV-1a prime
  }
  return h | 0; // force int32
}
