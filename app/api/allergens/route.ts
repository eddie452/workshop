import { NextResponse } from "next/server";
import allergensData from "@/lib/data/allergens-seed.json";

/**
 * GET /api/allergens
 *
 * Returns the full list of allergens. Reads from the committed JSON seed
 * data so the endpoint works even without a live Supabase database.
 * Public — no auth required.
 */
export function GET() {
  return NextResponse.json(allergensData);
}
