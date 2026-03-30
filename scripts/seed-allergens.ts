/**
 * Seed script for Supabase allergens and seasonal_calendar tables.
 *
 * Usage: npx tsx scripts/seed-allergens.ts
 *
 * Requires env vars:
 *   SUPABASE_URL           – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – Service role key (bypasses RLS)
 *
 * Idempotent: uses upsert so it is safe to re-run.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

/* ------------------------------------------------------------------ */
/* Env validation                                                      */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ------------------------------------------------------------------ */
/* Load JSON data                                                      */
/* ------------------------------------------------------------------ */

interface AllergenSeed {
  id: string;
  common_name: string;
  botanical_name: string | null;
  iuis_designation: string | null;
  category: string;
  sub_category: string | null;
  vision_labels: string[];
  vision_min_confidence: number;
  particle_size_um_min: number | null;
  particle_size_um_max: number | null;
  settling_velocity_cm_s: number | null;
  spp_producer: boolean;
  spp_risk_level: string | null;
  lrt_capable: boolean;
  lrt_max_miles: number | null;
  lrt_source_regions: string[];
  base_elo: number;
  region_northeast: number;
  region_midwest: number;
  region_northwest: number;
  region_south_central: number;
  region_southeast: number;
  region_southwest: number;
  cross_reactive_foods: string[];
  pfas_severity: string | null;
}

interface SeasonalEntry {
  allergen_id: string;
  allergen_name: string;
  region: string;
  month: number;
  severity: string;
  activity_level: number;
}

const allergensPath = resolve(__dirname, "../lib/data/allergens-seed.json");
const calendarPath = resolve(__dirname, "../lib/data/seasonal-calendar.json");

const allergens: AllergenSeed[] = JSON.parse(
  readFileSync(allergensPath, "utf-8"),
);
const calendar: SeasonalEntry[] = JSON.parse(
  readFileSync(calendarPath, "utf-8"),
);

/* ------------------------------------------------------------------ */
/* Upsert allergens                                                    */
/* ------------------------------------------------------------------ */

async function seedAllergens(): Promise<void> {
  console.log(`→ Upserting ${allergens.length} allergens...`);

  const rows = allergens.map((a) => ({
    id: a.id,
    common_name: a.common_name,
    botanical_name: a.botanical_name,
    iuis_designation: a.iuis_designation,
    category: a.category,
    sub_category: a.sub_category,
    vision_labels: a.vision_labels,
    vision_min_confidence: a.vision_min_confidence,
    particle_size_um_min: a.particle_size_um_min,
    particle_size_um_max: a.particle_size_um_max,
    settling_velocity_cm_s: a.settling_velocity_cm_s,
    spp_producer: a.spp_producer,
    spp_risk_level: a.spp_risk_level,
    lrt_capable: a.lrt_capable,
    lrt_max_miles: a.lrt_max_miles,
    lrt_source_regions: a.lrt_source_regions,
    base_elo: a.base_elo,
    region_northeast: a.region_northeast,
    region_midwest: a.region_midwest,
    region_northwest: a.region_northwest,
    region_south_central: a.region_south_central,
    region_southeast: a.region_southeast,
    region_southwest: a.region_southwest,
    cross_reactive_foods: a.cross_reactive_foods,
    pfas_severity: a.pfas_severity,
  }));

  const { error } = await supabase
    .from("allergens")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("✗ Failed to upsert allergens:", error.message);
    process.exit(1);
  }

  console.log(`→ Allergens upserted successfully`);
}

/* ------------------------------------------------------------------ */
/* Upsert seasonal calendar                                            */
/* ------------------------------------------------------------------ */

async function seedSeasonalCalendar(): Promise<void> {
  console.log(`→ Upserting ${calendar.length} seasonal calendar entries...`);

  // Batch in groups of 500 to avoid payload limits
  const batchSize = 500;

  for (let i = 0; i < calendar.length; i += batchSize) {
    const batch = calendar.slice(i, i + batchSize).map((entry) => ({
      allergen_id: entry.allergen_id,
      region: entry.region,
      month: entry.month,
      activity_level: entry.activity_level,
    }));

    const { error } = await supabase
      .from("seasonal_calendar")
      .upsert(batch, { onConflict: "allergen_id,region,month" });

    if (error) {
      console.error(
        `✗ Failed to upsert seasonal calendar batch ${i}:`,
        error.message,
      );
      process.exit(1);
    }
  }

  console.log(`→ Seasonal calendar upserted successfully`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log("Allergy Madness — Seed Script");
  console.log("=============================\n");

  await seedAllergens();
  await seedSeasonalCalendar();

  console.log("\n→ Seed complete!");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
