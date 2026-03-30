/**
 * Monte Carlo Exposure Simulation Tests
 *
 * Validates the Stokes' Law-based Monte Carlo simulation including
 * physics factors, deterministic seeded RNG, and performance.
 */

import { describe, it, expect } from "vitest";
import {
  createSeededRng,
  windDispersionFactor,
  settlingFactor,
  humidityFactor,
  rainWashoutFactor,
  thunderstormFactor,
  getPollenUpi,
  upiToConcentration,
  simulateExposure,
  runMonteCarloForAllergen,
  runMonteCarloForAll,
  MC_N_SIMULATIONS,
  MC_EXPOSURE_THRESHOLD,
  MC_POLLEN_DEFAULT_UPI,
  MC_MAX_CONFIDENCE_BOOST,
  MC_MIN_CONFIDENCE_BOOST,
} from "@/lib/engine/monte-carlo";
import type {
  MCAllergenInput,
  MCEnvironment,
} from "@/lib/engine/monte-carlo";
import { WEATHER_DEFAULTS } from "@/lib/apis/weather";
import { POLLEN_DEFAULTS } from "@/lib/apis/pollen";

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

const OAK: MCAllergenInput = {
  allergen_id: "oak",
  particle_size_um: 25,
  settling_velocity_cm_s: 3.1,
  spp_producer: true,
  category: "tree",
};

const MOLD: MCAllergenInput = {
  allergen_id: "alternaria",
  particle_size_um: 5,
  settling_velocity_cm_s: 0.5,
  spp_producer: false,
  category: "mold",
};

const GRASS: MCAllergenInput = {
  allergen_id: "bermuda",
  particle_size_um: 28,
  settling_velocity_cm_s: 3.5,
  spp_producer: false,
  category: "grass",
};

const DEFAULT_ENV: MCEnvironment = {
  weather: {
    temp_f: 72,
    humidity_pct: 50,
    wind_mph: 10,
    wind_direction_deg: 180,
    rain_last_12h: false,
    thunderstorm_6h: false,
  },
  pollen: {
    upi_tree: 3,
    upi_grass: 2,
    upi_weed: 1,
    species: [],
    date: "2026-03-30",
  },
};

const CALM_ENV: MCEnvironment = {
  weather: {
    ...DEFAULT_ENV.weather,
    wind_mph: 0,
  },
  pollen: DEFAULT_ENV.pollen,
};

const WINDY_ENV: MCEnvironment = {
  weather: {
    ...DEFAULT_ENV.weather,
    wind_mph: 25,
  },
  pollen: DEFAULT_ENV.pollen,
};

const RAINY_ENV: MCEnvironment = {
  weather: {
    ...DEFAULT_ENV.weather,
    rain_last_12h: true,
  },
  pollen: DEFAULT_ENV.pollen,
};

const THUNDERSTORM_ENV: MCEnvironment = {
  weather: {
    ...DEFAULT_ENV.weather,
    thunderstorm_6h: true,
  },
  pollen: DEFAULT_ENV.pollen,
};

/* ------------------------------------------------------------------ */
/* Seeded RNG                                                          */
/* ------------------------------------------------------------------ */

describe("createSeededRng", () => {
  it("produces deterministic sequence from same seed", () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences from different seeds", () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(99);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it("produces values in [0, 1) range", () => {
    const rng = createSeededRng(42);
    const values = Array.from({ length: 1000 }, () => rng());
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Physics factors                                                     */
/* ------------------------------------------------------------------ */

describe("windDispersionFactor", () => {
  it("returns 0 for zero wind", () => {
    expect(windDispersionFactor(0)).toBe(0);
  });

  it("returns 0.5 for 10 mph wind", () => {
    expect(windDispersionFactor(10)).toBe(0.5);
  });

  it("caps at 1.0 for wind >= 20 mph", () => {
    expect(windDispersionFactor(20)).toBe(1.0);
    expect(windDispersionFactor(50)).toBe(1.0);
  });
});

describe("settlingFactor", () => {
  it("returns higher value for slower settling (smaller particles)", () => {
    const moldFactor = settlingFactor(0.5); // mold spores
    const oakFactor = settlingFactor(3.1); // oak pollen
    expect(moldFactor).toBeGreaterThan(oakFactor);
  });

  it("returns value between 0 and 1", () => {
    expect(settlingFactor(0.1)).toBeLessThanOrEqual(1);
    expect(settlingFactor(0.1)).toBeGreaterThan(0);
    expect(settlingFactor(10)).toBeGreaterThan(0);
    expect(settlingFactor(10)).toBeLessThan(1);
  });

  it("approaches 1 for very slow settling", () => {
    expect(settlingFactor(0.01)).toBeGreaterThan(0.99);
  });
});

describe("humidityFactor", () => {
  it("returns lowest value at 50% humidity", () => {
    const at50 = humidityFactor(50);
    const at20 = humidityFactor(20);
    const at80 = humidityFactor(80);
    expect(at50).toBeLessThan(at20);
    expect(at50).toBeLessThan(at80);
  });

  it("returns 0.5 at exactly 50% humidity", () => {
    expect(humidityFactor(50)).toBe(0.5);
  });
});

describe("rainWashoutFactor", () => {
  it("returns 0.3 when raining", () => {
    expect(rainWashoutFactor(true)).toBe(0.3);
  });

  it("returns 1.0 when not raining", () => {
    expect(rainWashoutFactor(false)).toBe(1.0);
  });
});

describe("thunderstormFactor", () => {
  it("returns 2.5 for thunderstorm + SPP producer", () => {
    expect(thunderstormFactor(true, true)).toBe(2.5);
  });

  it("returns 0.7 for thunderstorm + non-SPP producer", () => {
    expect(thunderstormFactor(true, false)).toBe(0.7);
  });

  it("returns 1.0 when no thunderstorm", () => {
    expect(thunderstormFactor(false, true)).toBe(1.0);
    expect(thunderstormFactor(false, false)).toBe(1.0);
  });
});

/* ------------------------------------------------------------------ */
/* Pollen helpers                                                      */
/* ------------------------------------------------------------------ */

describe("getPollenUpi", () => {
  it("returns tree UPI for tree category", () => {
    expect(getPollenUpi(DEFAULT_ENV.pollen, "tree")).toBe(3);
  });

  it("returns grass UPI for grass category", () => {
    expect(getPollenUpi(DEFAULT_ENV.pollen, "grass")).toBe(2);
  });

  it("returns weed UPI for weed category", () => {
    expect(getPollenUpi(DEFAULT_ENV.pollen, "weed")).toBe(1);
  });

  it("returns default UPI for non-pollen categories", () => {
    expect(getPollenUpi(DEFAULT_ENV.pollen, "mold")).toBe(
      MC_POLLEN_DEFAULT_UPI,
    );
    expect(getPollenUpi(DEFAULT_ENV.pollen, "indoor")).toBe(
      MC_POLLEN_DEFAULT_UPI,
    );
    expect(getPollenUpi(DEFAULT_ENV.pollen, "food")).toBe(
      MC_POLLEN_DEFAULT_UPI,
    );
  });

  it("returns default UPI when pollen data is null", () => {
    expect(getPollenUpi(POLLEN_DEFAULTS, "tree")).toBe(MC_POLLEN_DEFAULT_UPI);
  });
});

describe("upiToConcentration", () => {
  it("returns 0 for UPI 0", () => {
    expect(upiToConcentration(0)).toBe(0);
  });

  it("returns 1.0 for UPI 5", () => {
    expect(upiToConcentration(5)).toBe(1.0);
  });

  it("returns 0.6 for UPI 3", () => {
    expect(upiToConcentration(3)).toBe(0.6);
  });

  it("caps at 1.0 for UPI > 5", () => {
    expect(upiToConcentration(10)).toBe(1.0);
  });
});

/* ------------------------------------------------------------------ */
/* Single simulation                                                   */
/* ------------------------------------------------------------------ */

describe("simulateExposure", () => {
  it("returns value between 0 and 1", () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const val = simulateExposure(OAK, 10, 50, false, false, 0.6, rng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("returns 0 when pollen concentration is 0", () => {
    const rng = createSeededRng(42);
    const val = simulateExposure(OAK, 10, 50, false, false, 0, rng);
    expect(val).toBe(0);
  });

  it("returns 0 when wind is 0 (no dispersion)", () => {
    const rng = createSeededRng(42);
    const val = simulateExposure(OAK, 0, 50, false, false, 0.6, rng);
    expect(val).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Monte Carlo runner                                                  */
/* ------------------------------------------------------------------ */

describe("runMonteCarloForAllergen", () => {
  it("produces deterministic results with same seed", () => {
    const r1 = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
    const r2 = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
    expect(r1.exposure_score).toBe(r2.exposure_score);
    expect(r1.exceedance_rate).toBe(r2.exceedance_rate);
    expect(r1.exposure_std).toBe(r2.exposure_std);
  });

  it("runs MC_N_SIMULATIONS by default", () => {
    const result = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
    expect(result.n_simulations).toBe(MC_N_SIMULATIONS);
  });

  it("allows custom simulation count", () => {
    const result = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42, 100);
    expect(result.n_simulations).toBe(100);
  });

  it("returns allergen_id in result", () => {
    const result = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
    expect(result.allergen_id).toBe("oak");
  });

  describe("wind speed effect", () => {
    it("zero wind produces lower exposure than high wind", () => {
      const calm = runMonteCarloForAllergen(OAK, CALM_ENV, 42);
      const windy = runMonteCarloForAllergen(OAK, WINDY_ENV, 42);
      expect(windy.exposure_score).toBeGreaterThan(calm.exposure_score);
    });
  });

  describe("particle size effect", () => {
    it("smaller particles (mold) have higher exposure than larger (grass)", () => {
      const moldResult = runMonteCarloForAllergen(MOLD, DEFAULT_ENV, 42);
      const grassResult = runMonteCarloForAllergen(GRASS, DEFAULT_ENV, 42);
      expect(moldResult.exposure_score).toBeGreaterThan(
        grassResult.exposure_score,
      );
    });
  });

  describe("rain effect", () => {
    it("rain reduces exposure score", () => {
      const dry = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
      const rainy = runMonteCarloForAllergen(OAK, RAINY_ENV, 42);
      expect(rainy.exposure_score).toBeLessThan(dry.exposure_score);
    });
  });

  describe("thunderstorm effect", () => {
    it("thunderstorm increases exposure for SPP producers", () => {
      const normal = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
      const storm = runMonteCarloForAllergen(OAK, THUNDERSTORM_ENV, 42);
      // OAK is SPP producer → thunderstorm should boost exposure
      expect(storm.exposure_score).toBeGreaterThan(normal.exposure_score);
    });

    it("thunderstorm reduces exposure for non-SPP allergens", () => {
      const normal = runMonteCarloForAllergen(GRASS, DEFAULT_ENV, 42);
      const storm = runMonteCarloForAllergen(GRASS, THUNDERSTORM_ENV, 42);
      // GRASS is not SPP producer → thunderstorm rain effect reduces exposure
      expect(storm.exposure_score).toBeLessThan(normal.exposure_score);
    });
  });

  describe("confidence boost", () => {
    it("confidence boost is between min and max", () => {
      const result = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
      expect(result.confidence_boost).toBeGreaterThanOrEqual(
        MC_MIN_CONFIDENCE_BOOST,
      );
      expect(result.confidence_boost).toBeLessThanOrEqual(
        MC_MAX_CONFIDENCE_BOOST,
      );
    });
  });

  describe("default weather handling", () => {
    it("uses defaults when weather values are null", () => {
      const nullWeatherEnv: MCEnvironment = {
        weather: WEATHER_DEFAULTS,
        pollen: DEFAULT_ENV.pollen,
      };
      const result = runMonteCarloForAllergen(OAK, nullWeatherEnv, 42);
      // Should not crash and produce a valid result
      expect(result.exposure_score).toBeGreaterThanOrEqual(0);
      expect(result.exposure_score).toBeLessThanOrEqual(1);
      expect(result.n_simulations).toBe(MC_N_SIMULATIONS);
    });

    it("uses defaults when pollen values are null", () => {
      const nullPollenEnv: MCEnvironment = {
        weather: DEFAULT_ENV.weather,
        pollen: POLLEN_DEFAULTS,
      };
      const result = runMonteCarloForAllergen(OAK, nullPollenEnv, 42);
      expect(result.exposure_score).toBeGreaterThanOrEqual(0);
      expect(result.n_simulations).toBe(MC_N_SIMULATIONS);
    });
  });

  describe("exceedance rate", () => {
    it("exceedance rate is between 0 and 1", () => {
      const result = runMonteCarloForAllergen(OAK, DEFAULT_ENV, 42);
      expect(result.exceedance_rate).toBeGreaterThanOrEqual(0);
      expect(result.exceedance_rate).toBeLessThanOrEqual(1);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Batch runner                                                        */
/* ------------------------------------------------------------------ */

describe("runMonteCarloForAll", () => {
  it("returns results for all allergens", () => {
    const allergens = [OAK, MOLD, GRASS];
    const results = runMonteCarloForAll(allergens, DEFAULT_ENV, 42);
    expect(results).toHaveLength(3);
    expect(results[0].allergen_id).toBe("oak");
    expect(results[1].allergen_id).toBe("alternaria");
    expect(results[2].allergen_id).toBe("bermuda");
  });

  it("produces deterministic results with same base seed", () => {
    const allergens = [OAK, MOLD, GRASS];
    const r1 = runMonteCarloForAll(allergens, DEFAULT_ENV, 42);
    const r2 = runMonteCarloForAll(allergens, DEFAULT_ENV, 42);
    expect(r1).toEqual(r2);
  });

  it("handles empty allergen array", () => {
    const results = runMonteCarloForAll([], DEFAULT_ENV, 42);
    expect(results).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

describe("performance", () => {
  it("completes 40 allergens x 1000 sims in < 2 seconds", () => {
    // Generate 40 allergens with varied properties
    const allergens: MCAllergenInput[] = Array.from(
      { length: 40 },
      (_, i) => ({
        allergen_id: `allergen-${i}`,
        particle_size_um: 5 + i * 0.5,
        settling_velocity_cm_s: 0.5 + i * 0.2,
        spp_producer: i % 3 === 0,
        category: ["tree", "grass", "weed", "mold", "indoor", "food"][
          i % 6
        ],
      }),
    );

    const start = performance.now();
    const results = runMonteCarloForAll(allergens, DEFAULT_ENV, 42);
    const elapsed = performance.now() - start;

    expect(results).toHaveLength(40);
    expect(elapsed).toBeLessThan(2000); // < 2 seconds
  });
});

/* ------------------------------------------------------------------ */
/* Constants validation                                                */
/* ------------------------------------------------------------------ */

describe("constants", () => {
  it("MC_N_SIMULATIONS is 1000", () => {
    expect(MC_N_SIMULATIONS).toBe(1000);
  });

  it("MC_EXPOSURE_THRESHOLD is 0.5", () => {
    expect(MC_EXPOSURE_THRESHOLD).toBe(0.5);
  });

  it("MC_MAX_CONFIDENCE_BOOST is 2.0", () => {
    expect(MC_MAX_CONFIDENCE_BOOST).toBe(2.0);
  });

  it("MC_MIN_CONFIDENCE_BOOST is 1.0", () => {
    expect(MC_MIN_CONFIDENCE_BOOST).toBe(1.0);
  });
});
