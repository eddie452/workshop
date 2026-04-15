/**
 * Final Four Gated Reveal — server-side payload shaping
 *
 * Transforms the full ranked allergen list into the client-facing shape
 * used by the leaderboard, applying the freemium gate to ranks #2-#4:
 *
 *   - Pro users (isPremium): Final Four is fully revealed.
 *   - Free users with >= 3 referral credits (or referralUnlocked=true):
 *     Final Four is fully revealed.
 *   - Free users with < 3 credits: each Final Four entry is redacted —
 *     common_name, elo_score, and confidence_tier are set to null and
 *     `locked: true` is set. Category is preserved so the client can
 *     render a category-appropriate silhouette.
 *
 * The champion (#1) is always returned unredacted — that's the hook.
 * Rows beyond the Final Four (ranks #5+) pass through unchanged; their
 * gating (score visibility) is handled separately in the Full Rankings
 * section of the leaderboard.
 *
 * Guardrail (#157): the blur is on the server-rendered payload too —
 * raw name/score/tier for ranks 2-4 are NEVER sent to the browser for
 * free users without credits, defending against view-source reveal.
 */

import { REFERRAL_UNLOCK_THRESHOLD } from "@/lib/referral/constants";
import type {
  RankedAllergen,
  GatedRankedAllergen,
} from "@/components/leaderboard/types";

export interface GateFinalFourInput {
  /** Ranked allergens sorted by Elo descending (as produced by the engine). */
  allergens: RankedAllergen[];
  /** Whether the user has an active Madness+/Family subscription. */
  isPremium: boolean;
  /** Current successful referral invite count (0+). */
  referralCount: number;
  /**
   * Whether the user's profile carries the permanent `features_unlocked`
   * flag set by the referral RPC once the threshold is crossed.
   * When true, this grants Final Four access even if the live count
   * later drops (e.g., referred user deletes their account).
   */
  referralUnlocked: boolean;
}

export interface GateFinalFourResult {
  /**
   * The allergens payload to pass to the client leaderboard. Ranks #1
   * and #5+ are always present in full; ranks #2-#4 are stripped from
   * this array to prevent their raw values from ever reaching the
   * browser for locked users. The `gated` array below carries the
   * client-safe (possibly redacted) Final Four.
   */
  allergensForClient: RankedAllergen[];
  /** Client-safe Final Four payload; may contain redacted entries. */
  gated: GatedRankedAllergen[];
  /** Whether the Final Four reveal is unlocked for this user. */
  isUnlocked: boolean;
}

export function gateFinalFour(input: GateFinalFourInput): GateFinalFourResult {
  const { allergens, isPremium, referralCount, referralUnlocked } = input;

  const isUnlocked =
    isPremium ||
    referralUnlocked ||
    referralCount >= REFERRAL_UNLOCK_THRESHOLD;

  const finalFourSlice = allergens.slice(1, 4);
  const champion = allergens[0];
  const tail = allergens.slice(4);

  const gated: GatedRankedAllergen[] = finalFourSlice.map((a) => {
    if (isUnlocked) {
      return {
        allergen_id: a.allergen_id,
        rank: a.rank,
        category: a.category,
        common_name: a.common_name,
        elo_score: a.elo_score,
        confidence_tier: a.confidence_tier,
        score: a.score,
        locked: false,
      };
    }
    // Redacted: strip identifying fields so they never cross the wire.
    return {
      allergen_id: a.allergen_id,
      rank: a.rank,
      category: a.category,
      common_name: null,
      elo_score: null,
      confidence_tier: null,
      score: null,
      locked: true,
    };
  });

  // Remove the raw Final Four slice from the client-facing allergens
  // array — the leaderboard component reads Final Four data from
  // `gated` instead.
  const allergensForClient: RankedAllergen[] = champion
    ? [champion, ...tail]
    : [...tail];

  return {
    allergensForClient,
    gated,
    isUnlocked,
  };
}
