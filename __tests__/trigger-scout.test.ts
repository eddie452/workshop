/**
 * Trigger Scout Engine Tests
 *
 * Tests for:
 * - Vision AI label matching against allergen seed data
 * - 2.5x multiplier applied when all 3 conditions met
 * - Dormant badge when conditions are not met
 * - No raw image data stored (verified by type constraints)
 */

import { describe, it, expect } from "vitest";
import {
  matchLabelsToAllergen,
  matchLabelsToAllergens,
  analyzeScan,
  TRIGGER_SCOUT_PROXIMITY_MULTIPLIER,
} from "@/lib/engine/trigger-scout";
import type {
  ScoutAllergenSeed,
  ScoutConditions,
  ScoutMatch,
} from "@/lib/engine/trigger-scout";
import type { VisionLabel } from "@/lib/apis/vision";

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

const OAK_ALLERGEN: ScoutAllergenSeed = {
  id: "oak",
  common_name: "Oak",
  category: "tree",
  vision_labels: ["oak tree", "oak leaf", "quercus", "acorn"],
  vision_min_confidence: 0.7,
};

const BIRCH_ALLERGEN: ScoutAllergenSeed = {
  id: "birch",
  common_name: "Birch",
  category: "tree",
  vision_labels: ["birch tree", "birch bark", "betula"],
  vision_min_confidence: 0.7,
};

const RAGWEED_ALLERGEN: ScoutAllergenSeed = {
  id: "ragweed",
  common_name: "Ragweed",
  category: "weed",
  vision_labels: ["ragweed", "ambrosia", "ragweed plant"],
  vision_min_confidence: 0.65,
};

const DUST_MITES_ALLERGEN: ScoutAllergenSeed = {
  id: "dust-mites",
  common_name: "Dust Mites",
  category: "indoor",
  vision_labels: [],
  vision_min_confidence: 0.9,
};

const ALL_ALLERGENS = [OAK_ALLERGEN, BIRCH_ALLERGEN, RAGWEED_ALLERGEN, DUST_MITES_ALLERGEN];

/* ------------------------------------------------------------------ */
/* matchLabelsToAllergen                                               */
/* ------------------------------------------------------------------ */

describe("matchLabelsToAllergen", () => {
  it("returns a match when a Vision label matches an allergen label above threshold", () => {
    const labels: VisionLabel[] = [
      { description: "oak tree", score: 0.92 },
      { description: "green foliage", score: 0.99 },
    ];

    const result = matchLabelsToAllergen(labels, OAK_ALLERGEN);

    expect(result).not.toBeNull();
    expect(result!.allergen_id).toBe("oak");
    expect(result!.matched_label).toBe("oak tree");
    expect(result!.confidence).toBe(0.92);
  });

  it("returns null when confidence is below the allergen threshold", () => {
    const labels: VisionLabel[] = [
      { description: "oak tree", score: 0.5 },
    ];

    const result = matchLabelsToAllergen(labels, OAK_ALLERGEN);
    expect(result).toBeNull();
  });

  it("returns null when no labels match", () => {
    const labels: VisionLabel[] = [
      { description: "cat", score: 0.95 },
      { description: "sunset", score: 0.88 },
    ];

    const result = matchLabelsToAllergen(labels, OAK_ALLERGEN);
    expect(result).toBeNull();
  });

  it("returns null for allergens with empty vision_labels (e.g., dust mites)", () => {
    const labels: VisionLabel[] = [
      { description: "dust", score: 0.95 },
    ];

    const result = matchLabelsToAllergen(labels, DUST_MITES_ALLERGEN);
    expect(result).toBeNull();
  });

  it("returns the highest confidence match when multiple labels match", () => {
    const labels: VisionLabel[] = [
      { description: "oak leaf", score: 0.75 },
      { description: "oak tree", score: 0.92 },
      { description: "quercus", score: 0.80 },
    ];

    const result = matchLabelsToAllergen(labels, OAK_ALLERGEN);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.92);
    expect(result!.matched_label).toBe("oak tree");
  });

  it("matches via substring (Vision label contains seed label)", () => {
    const labels: VisionLabel[] = [
      { description: "old oak tree in park", score: 0.85 },
    ];

    const result = matchLabelsToAllergen(labels, OAK_ALLERGEN);

    expect(result).not.toBeNull();
    expect(result!.allergen_id).toBe("oak");
  });

  it("matches case-insensitively", () => {
    const labels: VisionLabel[] = [
      { description: "Oak Tree", score: 0.88 },
    ];

    const result = matchLabelsToAllergen(labels, OAK_ALLERGEN);

    expect(result).not.toBeNull();
    expect(result!.allergen_id).toBe("oak");
  });
});

/* ------------------------------------------------------------------ */
/* matchLabelsToAllergens                                              */
/* ------------------------------------------------------------------ */

describe("matchLabelsToAllergens", () => {
  it("matches multiple allergens from a single set of labels", () => {
    const labels: VisionLabel[] = [
      { description: "oak tree", score: 0.92 },
      { description: "birch bark", score: 0.85 },
      { description: "grass", score: 0.77 },
    ];

    const results = matchLabelsToAllergens(labels, ALL_ALLERGENS);

    expect(results.length).toBe(2);
    expect(results.map((r) => r.allergen_id)).toContain("oak");
    expect(results.map((r) => r.allergen_id)).toContain("birch");
  });

  it("returns results sorted by confidence descending", () => {
    const labels: VisionLabel[] = [
      { description: "birch tree", score: 0.95 },
      { description: "oak tree", score: 0.72 },
    ];

    const results = matchLabelsToAllergens(labels, ALL_ALLERGENS);

    expect(results.length).toBe(2);
    expect(results[0].allergen_id).toBe("birch");
    expect(results[1].allergen_id).toBe("oak");
  });

  it("returns empty array when no labels match any allergen", () => {
    const labels: VisionLabel[] = [
      { description: "car", score: 0.99 },
      { description: "building", score: 0.95 },
    ];

    const results = matchLabelsToAllergens(labels, ALL_ALLERGENS);
    expect(results).toEqual([]);
  });

  it("skips allergens with empty vision_labels", () => {
    const labels: VisionLabel[] = [
      { description: "dust mite", score: 0.95 },
    ];

    const results = matchLabelsToAllergens(labels, ALL_ALLERGENS);
    expect(results.map((r) => r.allergen_id)).not.toContain("dust-mites");
  });
});

/* ------------------------------------------------------------------ */
/* analyzeScan — 2.5x multiplier conditions                           */
/* ------------------------------------------------------------------ */

describe("analyzeScan", () => {
  const oakMatch: ScoutMatch = {
    allergen_id: "oak",
    common_name: "Oak",
    category: "tree",
    matched_label: "oak tree",
    confidence: 0.92,
  };

  const birchMatch: ScoutMatch = {
    allergen_id: "birch",
    common_name: "Birch",
    category: "tree",
    matched_label: "birch tree",
    confidence: 0.85,
  };

  it("marks allergen as ACTIVE when all 3 conditions are met", () => {
    const conditions = new Map<string, ScoutConditions>([
      [
        "oak",
        {
          symptoms_present: true,
          seasonal_active: true,
        },
      ],
    ]);

    const result = analyzeScan([oakMatch], conditions);

    expect(result.active_allergen_ids).toContain("oak");
    expect(result.dormant_allergen_ids).not.toContain("oak");
    expect(result.has_active_matches).toBe(true);
  });

  it("marks allergen as DORMANT when symptoms are NOT present", () => {
    const conditions = new Map<string, ScoutConditions>([
      [
        "oak",
        {
          symptoms_present: false,
          seasonal_active: true,
        },
      ],
    ]);

    const result = analyzeScan([oakMatch], conditions);

    expect(result.dormant_allergen_ids).toContain("oak");
    expect(result.active_allergen_ids).not.toContain("oak");
    expect(result.has_active_matches).toBe(false);
  });

  it("marks allergen as DORMANT when NOT seasonally active", () => {
    const conditions = new Map<string, ScoutConditions>([
      [
        "oak",
        {
          symptoms_present: true,
          seasonal_active: false,
        },
      ],
    ]);

    const result = analyzeScan([oakMatch], conditions);

    expect(result.dormant_allergen_ids).toContain("oak");
    expect(result.active_allergen_ids).not.toContain("oak");
    expect(result.has_active_matches).toBe(false);
  });

  it("marks allergen as DORMANT when BOTH conditions are missing", () => {
    const conditions = new Map<string, ScoutConditions>([
      [
        "oak",
        {
          symptoms_present: false,
          seasonal_active: false,
        },
      ],
    ]);

    const result = analyzeScan([oakMatch], conditions);

    expect(result.dormant_allergen_ids).toContain("oak");
    expect(result.active_allergen_ids).not.toContain("oak");
  });

  it("handles mix of active and dormant allergens", () => {
    const conditions = new Map<string, ScoutConditions>([
      ["oak", { symptoms_present: true, seasonal_active: true }],
      ["birch", { symptoms_present: true, seasonal_active: false }],
    ]);

    const result = analyzeScan([oakMatch, birchMatch], conditions);

    expect(result.active_allergen_ids).toEqual(["oak"]);
    expect(result.dormant_allergen_ids).toEqual(["birch"]);
    expect(result.has_active_matches).toBe(true);
  });

  it("marks allergen as dormant when no conditions exist for it", () => {
    const conditions = new Map<string, ScoutConditions>();

    const result = analyzeScan([oakMatch], conditions);

    expect(result.dormant_allergen_ids).toContain("oak");
    expect(result.active_allergen_ids).toHaveLength(0);
  });

  it("preserves all matches in the result", () => {
    const conditions = new Map<string, ScoutConditions>([
      ["oak", { symptoms_present: true, seasonal_active: true }],
      ["birch", { symptoms_present: false, seasonal_active: true }],
    ]);

    const result = analyzeScan([oakMatch, birchMatch], conditions);

    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].allergen_id).toBe("oak");
    expect(result.matches[1].allergen_id).toBe("birch");
  });
});

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

describe("TRIGGER_SCOUT_PROXIMITY_MULTIPLIER", () => {
  it("is 2.5x as specified in the ticket", () => {
    expect(TRIGGER_SCOUT_PROXIMITY_MULTIPLIER).toBe(2.5);
  });
});

/* ------------------------------------------------------------------ */
/* No raw image data stored (type safety)                              */
/* ------------------------------------------------------------------ */

describe("data safety", () => {
  it("ScoutScanResult contains no raw image data — only allergen IDs and metadata", () => {
    const conditions = new Map<string, ScoutConditions>([
      ["oak", { symptoms_present: true, seasonal_active: true }],
    ]);

    const match: ScoutMatch = {
      allergen_id: "oak",
      common_name: "Oak",
      category: "tree",
      matched_label: "oak tree",
      confidence: 0.92,
    };

    const result = analyzeScan([match], conditions);

    // Verify the result structure contains ONLY metadata, no image data
    const resultKeys = Object.keys(result);
    expect(resultKeys).toEqual([
      "matches",
      "active_allergen_ids",
      "dormant_allergen_ids",
      "has_active_matches",
    ]);

    // Verify matches contain only label metadata, not raw image data
    for (const m of result.matches) {
      const matchKeys = Object.keys(m);
      expect(matchKeys).toEqual([
        "allergen_id",
        "common_name",
        "category",
        "matched_label",
        "confidence",
      ]);
      // No base64, no image_data, no raw_image, etc.
      expect(m).not.toHaveProperty("image_data");
      expect(m).not.toHaveProperty("base64");
      expect(m).not.toHaveProperty("raw_image");
    }
  });
});
