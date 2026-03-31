/**
 * Child Profiles Service
 *
 * Server-side business logic for CRUD operations on child profiles.
 * Enforces the 5-child limit, validates input, and handles Elo seeding.
 *
 * Gate: madness_family tier only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ChildProfileInsert, ChildProfileUpdate, UserAllergenEloInsert } from "@/lib/supabase/types";
import type { CreateChildInput, UpdateChildInput, ChildProfileSummary } from "./types";
import { MAX_CHILDREN } from "./types";

type SupabaseDB = SupabaseClient<Database>;

/* ------------------------------------------------------------------ */
/* Type-safe query helpers (same pattern as other services)            */
/* ------------------------------------------------------------------ */

interface SingleSelectChain<T> {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{
          data: T | null;
          error: { message: string } | null;
        }>;
      };
      single: () => Promise<{
        data: T | null;
        error: { message: string } | null;
      }>;
    };
  };
}

interface InsertChain<T> {
  insert: (data: ChildProfileInsert) => {
    select: (cols: string) => {
      single: () => Promise<{
        data: T | null;
        error: { message: string } | null;
      }>;
    };
  };
}

interface UpdateChain {
  update: (data: ChildProfileUpdate) => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

interface DeleteChain {
  delete: () => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

interface EloInsertChain {
  insert: (data: UserAllergenEloInsert[]) => Promise<{
    error: { message: string } | null;
  }>;
}

/* ------------------------------------------------------------------ */
/* Service functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Get the count of child profiles for a parent.
 */
export async function getChildCount(
  supabase: SupabaseDB,
  parentId: string,
): Promise<number> {
  const result = await supabase
    .from("child_profiles")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parentId);

  if (result.error) {
    throw new Error(`Failed to count children: ${result.error.message}`);
  }

  return result.count ?? 0;
}

/**
 * List all child profiles for a parent.
 */
export async function listChildren(
  supabase: SupabaseDB,
  parentId: string,
): Promise<ChildProfileSummary[]> {
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id, name, birth_year, created_at, has_pets, prior_allergy_diagnosis, known_allergens")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list children: ${error.message}`);
  }

  return (data ?? []) as unknown as ChildProfileSummary[];
}

/**
 * Get a single child profile by ID (validates parent ownership via RLS).
 */
export async function getChild(
  supabase: SupabaseDB,
  childId: string,
  parentId: string,
): Promise<ChildProfileSummary | null> {
  const { data, error } = await (
    supabase.from("child_profiles") as unknown as SingleSelectChain<ChildProfileSummary>
  )
    .select("id, name, birth_year, created_at, has_pets, prior_allergy_diagnosis, known_allergens")
    .eq("id", childId)
    .eq("parent_id", parentId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Create a new child profile.
 * Enforces the MAX_CHILDREN limit.
 * Seeds child-specific Elo records by copying the parent's regional allergens.
 */
export async function createChild(
  supabase: SupabaseDB,
  parentId: string,
  input: CreateChildInput,
): Promise<{ success: true; child: ChildProfileSummary } | { success: false; error: string }> {
  // Validate input
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Child name is required" };
  }

  if (input.name.trim().length > 100) {
    return { success: false, error: "Child name must be 100 characters or less" };
  }

  // Enforce max children limit
  const count = await getChildCount(supabase, parentId);
  if (count >= MAX_CHILDREN) {
    return {
      success: false,
      error: `Maximum of ${MAX_CHILDREN} child profiles allowed`,
    };
  }

  // Insert child profile
  const insertData: ChildProfileInsert = {
    parent_id: parentId,
    name: input.name.trim(),
    birth_year: input.birth_year ?? null,
    has_pets: input.has_pets ?? null,
    prior_allergy_diagnosis: input.prior_allergy_diagnosis ?? false,
    known_allergens: input.known_allergens ?? null,
  };

  const { data: child, error: insertError } = await (
    supabase.from("child_profiles") as unknown as InsertChain<ChildProfileSummary>
  )
    .insert(insertData)
    .select("id, name, birth_year, created_at, has_pets, prior_allergy_diagnosis, known_allergens")
    .single();

  if (insertError || !child) {
    return {
      success: false,
      error: `Failed to create child profile: ${insertError?.message ?? "unknown error"}`,
    };
  }

  // Seed child-specific Elo records by copying parent's Elo
  await seedChildElo(supabase, parentId, child.id);

  return { success: true, child };
}

/**
 * Update an existing child profile.
 */
export async function updateChild(
  supabase: SupabaseDB,
  childId: string,
  parentId: string,
  input: UpdateChildInput,
): Promise<{ success: true } | { success: false; error: string }> {
  if (input.name !== undefined && input.name.trim().length === 0) {
    return { success: false, error: "Child name cannot be empty" };
  }

  if (input.name !== undefined && input.name.trim().length > 100) {
    return { success: false, error: "Child name must be 100 characters or less" };
  }

  const updateData: ChildProfileUpdate = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.birth_year !== undefined) updateData.birth_year = input.birth_year;
  if (input.has_pets !== undefined) updateData.has_pets = input.has_pets;
  if (input.prior_allergy_diagnosis !== undefined)
    updateData.prior_allergy_diagnosis = input.prior_allergy_diagnosis;
  if (input.known_allergens !== undefined)
    updateData.known_allergens = input.known_allergens;

  const { error } = await (
    supabase.from("child_profiles") as unknown as UpdateChain
  )
    .update(updateData)
    .eq("id", childId)
    .eq("parent_id", parentId);

  if (error) {
    return { success: false, error: `Failed to update child: ${error.message}` };
  }

  return { success: true };
}

/**
 * Delete a child profile and all associated data.
 * Cascade deletes handle Elo and check-in records via FK constraints.
 */
export async function deleteChild(
  supabase: SupabaseDB,
  childId: string,
  parentId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await (
    supabase.from("child_profiles") as unknown as DeleteChain
  )
    .delete()
    .eq("id", childId)
    .eq("parent_id", parentId);

  if (error) {
    return { success: false, error: `Failed to delete child: ${error.message}` };
  }

  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Seed Elo records for a new child by copying the parent's current Elo scores.
 * Each child starts with the same initial allergen rankings as the parent,
 * but their scores diverge independently from check-ins.
 */
async function seedChildElo(
  supabase: SupabaseDB,
  parentId: string,
  childId: string,
): Promise<void> {
  // Fetch parent's Elo records (parent records have child_id = null)
  const { data: parentElos, error: fetchError } = await supabase
    .from("user_allergen_elo")
    .select("allergen_id, elo_score")
    .eq("user_id", parentId)
    .is("child_id", null);

  if (fetchError || !parentElos || parentElos.length === 0) {
    // No parent Elo to copy — child will start fresh when parent re-onboards
    return;
  }

  const eloRows = parentElos as unknown as Array<{
    allergen_id: string;
    elo_score: number;
  }>;

  // Insert Elo records for the child
  const childEloInserts: UserAllergenEloInsert[] = eloRows.map((elo) => ({
    user_id: parentId,
    child_id: childId,
    allergen_id: elo.allergen_id,
    elo_score: elo.elo_score,
    positive_signals: 0,
    negative_signals: 0,
  }));

  if (childEloInserts.length > 0) {
    const { error: insertError } = await (
      supabase.from("user_allergen_elo") as unknown as EloInsertChain
    ).insert(childEloInserts);

    if (insertError) {
      console.error("Child Elo seeding warning:", insertError.message);
    }
  }
}
