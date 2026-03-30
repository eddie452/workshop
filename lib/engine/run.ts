/**
 * Tournament Run Orchestrator
 *
 * The main entry point that chains all engine modules into the
 * 10-step tournament pipeline. This is a pure function: no database
 * calls, no side effects. All DB I/O happens at the API layer.
 *
 * 10-Step Order of Operations:
 *   Step 1:  Global symptom gate check
 *   Step 2:  Get current Elo for each allergen (passed in as input)
 *   Step 3:  Apply seasonal multiplier
 *   Step 4:  Apply symptom-specificity multiplier
 *   Step 5:  Run Monte Carlo simulation
 *   Step 6:  Apply MC confidence boost
 *   Step 7:  Apply CCRS + indoor gate (cockroach only)
 *   Step 8:  Apply Trigger Scout proximity multiplier (if applicable)
 *   Step 9:  Pairwise tournament sort -> Final Four -> Trigger Champion
 *   Step 10: Map to confidence tiers, compute Elo updates with K-factor
 *
 * Server-side only — never import from client components.
 */

import type { Region } from "@/lib/supabase/types";
import type {
  AllergenElo,
  AllergenSeedData,
  Allergen,
  CCRSInput,
  EloUpdate,
  RunInput,
  RunOutput,
  SymptomInput,
  TournamentEntry,
} from "./types";
import type { MCAllergenInput, MCEnvironment } from "./monte-carlo";
import { checkSymptomGate, getAllSymptomMultipliers } from "./symptoms";
import { getAllSeasonalMultipliers } from "./seasonal";
import { runMonteCarloForAll } from "./monte-carlo";
import { applyCCRSGate } from "./ccrs";
import { detectLRTForAll } from "./lrt";
import { createTournamentEntry, runTournament } from "./tournament";
import { updateElo } from "./elo";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * Trigger Scout proximity multiplier.
 * Applied when an allergen is confirmed nearby via photo scan.
 */
const TRIGGER_SCOUT_MULTIPLIER = 1.3;

/* ------------------------------------------------------------------ */
/* Orchestrator                                                        */
/* ------------------------------------------------------------------ */

/**
 * Run the full 10-step tournament pipeline.
 *
 * This is the core orchestrator — a pure function that takes all
 * inputs and returns the complete tournament result with Elo updates.
 * No database calls or side effects.
 *
 * @param input — full tournament run input
 * @returns RunOutput with tournament result and Elo updates
 */
export function runTournamentPipeline(input: RunInput): RunOutput {
  const step_trace: string[] = [];

  /* ----------------------------------------------------------------
   * Step 1: Global symptom gate check
   * ---------------------------------------------------------------- */
  const symptoms: SymptomInput = input.symptoms;
  const gateOpen = checkSymptomGate(symptoms);
  step_trace.push(`Step 1: Symptom gate ${gateOpen ? "OPEN" : "CLOSED"} (severity=${symptoms.global_severity})`);

  if (!gateOpen) {
    // Severity = 0 → return Environmental Forecast, no scoring
    return {
      symptom_gate_passed: false,
      tournament: null,
      elo_updates: [],
      step_trace,
    };
  }

  /* ----------------------------------------------------------------
   * Step 2: Get current Elo for each allergen (passed in as input)
   * ---------------------------------------------------------------- */
  const eloMap = new Map<string, AllergenElo>();
  for (const elo of input.allergen_elos) {
    eloMap.set(elo.allergen_id, elo);
  }
  step_trace.push(`Step 2: Loaded Elo for ${eloMap.size} allergens`);

  /* ----------------------------------------------------------------
   * Step 3: Apply seasonal multiplier
   * ---------------------------------------------------------------- */
  const allergenIds = input.allergens.map((a) => a.id);
  const seasonalMultipliers = getAllSeasonalMultipliers(
    allergenIds,
    input.region,
    input.month,
  );
  const seasonalMap = new Map(
    seasonalMultipliers.map((s) => [s.allergen_id, s.multiplier]),
  );
  step_trace.push(`Step 3: Seasonal multipliers applied for ${input.region}, month ${input.month}`);

  /* ----------------------------------------------------------------
   * Step 4: Apply symptom-specificity multiplier
   * ---------------------------------------------------------------- */
  const allergenCategories = input.allergens.map((a) => ({
    allergen_id: a.id,
    category: a.category,
  }));
  const symptomMultipliers = getAllSymptomMultipliers(
    allergenCategories,
    symptoms,
  );
  const symptomMap = new Map(
    symptomMultipliers.map((s) => [s.allergen_id, s.multiplier]),
  );
  step_trace.push(`Step 4: Symptom multipliers applied for zones [${symptoms.zones.join(", ")}]`);

  /* ----------------------------------------------------------------
   * Step 5: Run Monte Carlo simulation
   * ---------------------------------------------------------------- */
  const mcAllergens: MCAllergenInput[] = input.allergens.map((a) => ({
    allergen_id: a.id,
    particle_size_um: a.particle_size_um,
    settling_velocity_cm_s: a.settling_velocity_cm_s,
    spp_producer: a.spp_producer,
    category: a.category,
  }));
  const mcEnv: MCEnvironment = {
    weather: input.environment.weather,
    pollen: input.environment.pollen,
  };
  const mcResults = runMonteCarloForAll(mcAllergens, mcEnv, input.seed);
  const mcMap = new Map(
    mcResults.map((r) => [r.allergen_id, r]),
  );
  step_trace.push(`Step 5: Monte Carlo ran ${mcResults.length} allergens x 1000 sims`);

  /* ----------------------------------------------------------------
   * Step 6: Apply MC confidence boost
   * (Included in Step 5 results — confidence_boost field)
   * ---------------------------------------------------------------- */
  step_trace.push("Step 6: MC confidence boosts computed");

  /* ----------------------------------------------------------------
   * Step 7: Apply CCRS + indoor gate (cockroach only)
   * ---------------------------------------------------------------- */
  const ccrsInput: CCRSInput = input.ccrs_input;
  step_trace.push(`Step 7: CCRS gate checked (ccrs=${ccrsInput.ccrs}, indoors=${ccrsInput.mostly_indoors})`);

  /* ----------------------------------------------------------------
   * Step 8: Apply Trigger Scout proximity multiplier
   * ---------------------------------------------------------------- */
  const triggerScoutSet = new Set(input.trigger_scout_allergens);
  step_trace.push(`Step 8: Trigger Scout active for ${triggerScoutSet.size} allergens`);

  /* ----------------------------------------------------------------
   * Compute composite scores
   * ---------------------------------------------------------------- */
  const entries: TournamentEntry[] = [];
  const compositeScores = new Map<string, number>();

  for (const allergen of input.allergens) {
    const baseElo = eloMap.get(allergen.id)?.elo_score ?? allergen.base_elo;
    const seasonal = seasonalMap.get(allergen.id) ?? 1.0;
    const symptom = symptomMap.get(allergen.id) ?? 1.0;
    const mc = mcMap.get(allergen.id);
    const mcBoost = mc?.confidence_boost ?? 1.0;
    const ccrsMultiplier = applyCCRSGate(allergen.id, ccrsInput);
    const triggerScout = triggerScoutSet.has(allergen.id)
      ? TRIGGER_SCOUT_MULTIPLIER
      : 1.0;

    // Composite = baseElo * seasonal * symptom * mcBoost * ccrs * triggerScout
    const composite =
      baseElo * seasonal * symptom * mcBoost * ccrsMultiplier * triggerScout;

    compositeScores.set(allergen.id, composite);
    entries.push(
      createTournamentEntry(
        allergen.id,
        allergen.common_name,
        allergen.category,
        composite,
      ),
    );
  }

  /* ----------------------------------------------------------------
   * Step 9: Pairwise tournament sort -> Final Four -> Trigger Champion
   * ---------------------------------------------------------------- */
  const tournament = runTournament(entries);
  step_trace.push(
    `Step 9: Tournament sorted — Champion: ${tournament.trigger_champion?.allergen_id ?? "none"}`,
  );

  /* ----------------------------------------------------------------
   * Step 10: Map to confidence tiers, compute Elo updates with K-factor
   * ---------------------------------------------------------------- */
  const eloUpdates: EloUpdate[] = [];

  for (const allergen of input.allergens) {
    const currentElo = eloMap.get(allergen.id);
    if (!currentElo) continue;

    const seasonal = seasonalMap.get(allergen.id) ?? 1.0;
    const symptom = symptomMap.get(allergen.id) ?? 1.0;

    // Weighted delta is the product of multipliers applied to a +1 signal
    // (positive signal = symptoms present, check-in happened)
    const weightedDelta = seasonal * symptom;

    const update = updateElo(currentElo, weightedDelta);
    eloUpdates.push(update);
  }

  step_trace.push(`Step 10: Computed ${eloUpdates.length} Elo updates`);

  return {
    symptom_gate_passed: true,
    tournament,
    elo_updates: eloUpdates,
    step_trace,
  };
}
