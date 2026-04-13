/**
 * Re-seed Elo rows for existing users who onboarded before the allergens
 * table was populated.
 *
 * Usage: npx tsx scripts/reseed-user-elo.ts
 *
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeAllElo } from "../lib/engine/elo";
import type { Allergen } from "../lib/engine/types";
import type { Region } from "../lib/supabase/types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const allergenSeed = JSON.parse(
  readFileSync(resolve(__dirname, "../lib/data/allergens-seed.json"), "utf-8"),
);

async function main(): Promise<void> {
  console.log("Re-seed Elo for existing users\n");

  // Get all user profiles
  const { data: profiles, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, home_region, home_state");

  if (profileError) {
    console.error("Failed to fetch profiles:", profileError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("No user profiles found.");
    return;
  }

  console.log(`Found ${profiles.length} user(s)\n`);

  for (const profile of profiles) {
    const userId = profile.id;
    const region: Region = profile.home_region ?? "Southeast";

    // Check existing elo rows
    const { count } = await supabase
      .from("user_allergen_elo")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("child_id", null);

    console.log(`User ${userId} (${region}): ${count ?? 0} existing elo rows`);

    if ((count ?? 0) > 0) {
      console.log(`  → Skipping (already has elo data)\n`);
      continue;
    }

    // Filter allergens by regional presence
    const regionField = `region_${region.toLowerCase().replaceAll(" ", "_")}`;
    const regionalAllergens = allergenSeed.filter(
      (a: Record<string, unknown>) => (a[regionField] as number) > 0,
    );

    const allergenData: Allergen[] = regionalAllergens.map(
      (a: Record<string, unknown>) => ({
        id: a.id as string,
        common_name: a.common_name as string,
        category: a.category as string,
        base_elo: a.base_elo as number,
        region_northeast: a.region_northeast as number,
        region_midwest: a.region_midwest as number,
        region_northwest: a.region_northwest as number,
        region_south_central: a.region_south_central as number,
        region_southeast: a.region_southeast as number,
        region_southwest: a.region_southwest as number,
      }),
    );

    const eloRecords = initializeAllElo(allergenData, region);

    const eloInserts = eloRecords.map((elo) => ({
      user_id: userId,
      allergen_id: elo.allergen_id,
      elo_score: elo.elo_score,
      positive_signals: 0,
      negative_signals: 0,
    }));

    const { error: insertError } = await supabase
      .from("user_allergen_elo")
      .insert(eloInserts);

    if (insertError) {
      console.error(`  ✗ Failed: ${insertError.message}\n`);
    } else {
      console.log(`  → Seeded ${eloInserts.length} allergen elo rows\n`);
    }
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
