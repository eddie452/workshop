import { describe, it, expect } from "vitest";
import { runTournamentPipeline } from "@/lib/engine/run";
import type {
  AllergenElo,
  AllergenSeedData,
  RunInput,
  SymptomInput,
  CCRSInput,
} from "@/lib/engine/types";
import type { WeatherResult } from "@/lib/apis/weather";
import type { PollenResult } from "@/lib/apis/pollen";

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

const makeAllergenSeed = (
  overrides: Partial<AllergenSeedData> = {},
): AllergenSeedData => ({
  id: "oak",
  common_name: "Oak",
  category: "tree",
  base_elo: 1400,
  region_northeast: 3,
  region_midwest: 3,
  region_northwest: 1,
  region_south_central: 4,
  region_southeast: 4,
  region_southwest: 2,
  particle_size_um: 25.0,
  settling_velocity_cm_s: 3.1,
  spp_producer: true,
  lrt_capable: false,
  lrt_max_miles: null,
  lrt_source_regions: [],
  ...overrides,
});

const makeAllergenElo = (
  overrides: Partial<AllergenElo> = {},
): AllergenElo => ({
  allergen_id: "oak",
  elo_score: 1000,
  positive_signals: 5,
  negative_signals: 2,
  ...overrides,
});

const defaultWeather: WeatherResult = {
  temp_f: 72,
  humidity_pct: 50,
  wind_mph: 5,
  wind_direction_deg: 180,
  rain_last_12h: false,
  thunderstorm_6h: false,
};

const defaultPollen: PollenResult = {
  upi_tree: 3.0,
  upi_grass: 2.0,
  upi_weed: 1.0,
  species: [],
  date: "2026-04-01",
};

const defaultSymptoms: SymptomInput = {
  zones: ["eyes", "nose"],
  global_severity: 2,
};

const defaultCCRS: CCRSInput = {
  ccrs: 0,
  cockroach_sighting: false,
  mostly_indoors: false,
  global_severity: 2,
};

const makeRunInput = (overrides: Partial<RunInput> = {}): RunInput => ({
  allergens: [
    makeAllergenSeed({ id: "oak", common_name: "Oak", category: "tree", base_elo: 1400 }),
    makeAllergenSeed({ id: "ragweed", common_name: "Ragweed", category: "weed", base_elo: 1600 }),
    makeAllergenSeed({ id: "dust-mites", common_name: "Dust Mites", category: "indoor", base_elo: 1200 }),
    makeAllergenSeed({ id: "alternaria", common_name: "Alternaria", category: "mold", base_elo: 1100 }),
    makeAllergenSeed({ id: "cockroach", common_name: "Cockroach", category: "indoor", base_elo: 1200 }),
  ],
  allergen_elos: [
    makeAllergenElo({ allergen_id: "oak", elo_score: 1300 }),
    makeAllergenElo({ allergen_id: "ragweed", elo_score: 1100 }),
    makeAllergenElo({ allergen_id: "dust-mites", elo_score: 900 }),
    makeAllergenElo({ allergen_id: "alternaria", elo_score: 1000 }),
    makeAllergenElo({ allergen_id: "cockroach", elo_score: 950 }),
  ],
  symptoms: defaultSymptoms,
  region: "Southeast",
  month: 4,
  ccrs_input: defaultCCRS,
  wind_direction_deg: 180,
  environment: {
    weather: defaultWeather,
    pollen: defaultPollen,
  },
  trigger_scout_allergens: [],
  seed: 42,
  ...overrides,
});

/* ------------------------------------------------------------------ */
/* Symptom gate (Step 1)                                               */
/* ------------------------------------------------------------------ */

describe("runTournamentPipeline — symptom gate", () => {
  it("returns Environmental Forecast when severity = 0", () => {
    const input = makeRunInput({
      symptoms: { zones: [], global_severity: 0 },
    });
    const result = runTournamentPipeline(input);

    expect(result.symptom_gate_passed).toBe(false);
    expect(result.tournament).toBeNull();
    expect(result.elo_updates).toHaveLength(0);
    expect(result.step_trace[0]).toContain("CLOSED");
  });

  it("proceeds when severity > 0", () => {
    const result = runTournamentPipeline(makeRunInput());
    expect(result.symptom_gate_passed).toBe(true);
    expect(result.tournament).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Full 10-step run                                                    */
/* ------------------------------------------------------------------ */

describe("runTournamentPipeline — full run", () => {
  it("produces expected output for known test fixture", () => {
    const result = runTournamentPipeline(makeRunInput());

    // Symptom gate passed
    expect(result.symptom_gate_passed).toBe(true);

    // Tournament result has all allergens
    expect(result.tournament).not.toBeNull();
    expect(result.tournament!.leaderboard).toHaveLength(5);

    // Final Four extracted
    expect(result.tournament!.final_four).toHaveLength(4);

    // Trigger Champion exists
    expect(result.tournament!.trigger_champion).not.toBeNull();

    // Elo updates computed for all allergens
    expect(result.elo_updates).toHaveLength(5);
  });

  it("step order matches expected 11-step trace", () => {
    const result = runTournamentPipeline(makeRunInput());

    // Verify all 11 steps were traced
    expect(result.step_trace.length).toBe(11);
    expect(result.step_trace[0]).toContain("Step 1");
    expect(result.step_trace[1]).toContain("Step 2");
    expect(result.step_trace[2]).toContain("Step 3");
    expect(result.step_trace[3]).toContain("Step 4");
    expect(result.step_trace[4]).toContain("Step 5");
    expect(result.step_trace[5]).toContain("Step 6");
    expect(result.step_trace[6]).toContain("Step 7");
    expect(result.step_trace[7]).toContain("Step 8");
    expect(result.step_trace[8]).toContain("Step 9");
    expect(result.step_trace[9]).toContain("Step 10");
    expect(result.step_trace[10]).toContain("Step 11");
  });

  it("CCRS blocks cockroach when gate conditions not met", () => {
    const input = makeRunInput({
      ccrs_input: {
        ccrs: 0,
        cockroach_sighting: false,
        mostly_indoors: false,
        global_severity: 2,
      },
    });
    const result = runTournamentPipeline(input);

    // Cockroach should have composite_score = 0 (blocked)
    const cockroach = result.tournament!.leaderboard.find(
      (e) => e.allergen_id === "cockroach",
    );
    expect(cockroach).toBeDefined();
    expect(cockroach!.composite_score).toBe(0);
  });

  it("CCRS allows cockroach when all 3 conditions pass", () => {
    const input = makeRunInput({
      ccrs_input: {
        ccrs: 50,
        cockroach_sighting: true,
        mostly_indoors: true,
        global_severity: 2,
      },
    });
    const result = runTournamentPipeline(input);

    const cockroach = result.tournament!.leaderboard.find(
      (e) => e.allergen_id === "cockroach",
    );
    expect(cockroach).toBeDefined();
    expect(cockroach!.composite_score).toBeGreaterThan(0);
  });

  it("applies Trigger Scout multiplier to specified allergens", () => {
    // Run without Trigger Scout
    const baseResult = runTournamentPipeline(
      makeRunInput({ trigger_scout_allergens: [] }),
    );
    const baseOak = baseResult.tournament!.leaderboard.find(
      (e) => e.allergen_id === "oak",
    );

    // Run with Trigger Scout on oak
    const scoutResult = runTournamentPipeline(
      makeRunInput({ trigger_scout_allergens: ["oak"] }),
    );
    const scoutOak = scoutResult.tournament!.leaderboard.find(
      (e) => e.allergen_id === "oak",
    );

    // Oak score should be boosted with Trigger Scout
    expect(scoutOak!.composite_score).toBeGreaterThan(
      baseOak!.composite_score,
    );
  });

  it("produces deterministic results with same seed", () => {
    const input = makeRunInput({ seed: 12345 });
    const result1 = runTournamentPipeline(input);
    const result2 = runTournamentPipeline(input);

    expect(result1.tournament!.leaderboard.map((e) => e.allergen_id)).toEqual(
      result2.tournament!.leaderboard.map((e) => e.allergen_id),
    );
    expect(result1.tournament!.leaderboard.map((e) => e.composite_score)).toEqual(
      result2.tournament!.leaderboard.map((e) => e.composite_score),
    );
  });

  it("Elo updates have correct structure", () => {
    const result = runTournamentPipeline(makeRunInput());

    for (const update of result.elo_updates) {
      expect(update).toHaveProperty("allergen_id");
      expect(update).toHaveProperty("new_elo");
      expect(update).toHaveProperty("delta");
      expect(update).toHaveProperty("k_factor");
      expect(update.new_elo).toBeGreaterThanOrEqual(100);
      expect(update.new_elo).toBeLessThanOrEqual(3000);
      expect(update.k_factor).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* LRT (Long-Range Transport) integration (Step 8)                     */
/* ------------------------------------------------------------------ */

describe("runTournamentPipeline — LRT integration", () => {
  it("applies LRT boost to LRT-capable allergens when wind aligns", () => {
    // Birch is LRT-capable, wind from South Central (180 deg), user in Southeast
    // South Central bearing = 180, wind_direction_deg = 180 → match
    const input = makeRunInput({
      allergens: [
        makeAllergenSeed({
          id: "birch",
          common_name: "Birch",
          category: "tree",
          base_elo: 1400,
          lrt_capable: true,
          lrt_max_miles: 500,
          lrt_source_regions: ["South Central", "Midwest"],
        }),
        makeAllergenSeed({
          id: "ragweed",
          common_name: "Ragweed",
          category: "weed",
          base_elo: 1400,
          lrt_capable: false,
          lrt_max_miles: null,
          lrt_source_regions: [],
        }),
      ],
      allergen_elos: [
        makeAllergenElo({ allergen_id: "birch", elo_score: 1000 }),
        makeAllergenElo({ allergen_id: "ragweed", elo_score: 1000 }),
      ],
      region: "Southeast",
      wind_direction_deg: 180,
    });

    const result = runTournamentPipeline(input);

    const birch = result.tournament!.leaderboard.find(
      (e) => e.allergen_id === "birch",
    );
    const ragweed = result.tournament!.leaderboard.find(
      (e) => e.allergen_id === "ragweed",
    );

    // Birch should have a higher composite score due to LRT boost (1.5x)
    expect(birch!.composite_score).toBeGreaterThan(ragweed!.composite_score);

    // Step trace should mention LRT detected
    const lrtStep = result.step_trace.find((s) => s.includes("Step 8"));
    expect(lrtStep).toContain("LRT detected for 1 allergens");
  });

  it("does not apply LRT boost to non-LRT-capable allergens", () => {
    // Run with no LRT-capable allergens
    const inputNoLRT = makeRunInput({
      wind_direction_deg: 180,
    });
    // Run with wind but no LRT allergens (default fixture has lrt_capable: false)
    const result = runTournamentPipeline(inputNoLRT);

    const lrtStep = result.step_trace.find((s) => s.includes("Step 8"));
    expect(lrtStep).toContain("LRT detected for 0 allergens");
  });
});
