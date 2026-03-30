import { NextResponse } from "next/server";
import calendarData from "@/lib/data/seasonal-calendar.json";

/**
 * Severity-to-multiplier mapping.
 * inactive → 0.0, mild → 1.2, moderate → 2.0, severe → 3.0
 */
const MULTIPLIER_MAP: Record<string, number> = {
  inactive: 0.0,
  mild: 1.2,
  moderate: 2.0,
  severe: 3.0,
};

const VALID_REGIONS = new Set([
  "Northeast",
  "Midwest",
  "Northwest",
  "South Central",
  "Southeast",
  "Southwest",
]);

/**
 * GET /api/allergens/seasonal?region=Southeast&month=4
 *
 * Returns seasonal calendar entries for the given region and month,
 * enriched with the Elo multiplier. Reads from committed JSON data
 * so the endpoint works without a live Supabase database.
 * Public — no auth required.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const monthStr = searchParams.get("month");

  if (!region || !monthStr) {
    return NextResponse.json(
      { error: "Missing required query params: region, month" },
      { status: 400 },
    );
  }

  if (!VALID_REGIONS.has(region)) {
    return NextResponse.json(
      {
        error: `Invalid region. Must be one of: ${[...VALID_REGIONS].join(", ")}`,
      },
      { status: 400 },
    );
  }

  const month = parseInt(monthStr, 10);
  if (isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Invalid month. Must be 1-12." },
      { status: 400 },
    );
  }

  const entries = calendarData
    .filter((entry) => entry.region === region && entry.month === month)
    .map((entry) => ({
      allergen_id: entry.allergen_id,
      allergen_name: entry.allergen_name,
      region: entry.region,
      month: entry.month,
      severity: entry.severity,
      activity_level: entry.activity_level,
      multiplier: MULTIPLIER_MAP[entry.severity] ?? 0.0,
    }));

  return NextResponse.json(entries);
}
