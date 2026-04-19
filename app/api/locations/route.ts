/**
 * /api/locations — Saved Places CRUD
 *
 * GET    — List all saved (non-home) places for the authenticated user
 * POST   — Create a new saved place (always `is_home = false`)
 * PATCH  — Update an existing saved place (requires ?id=<uuid>)
 * DELETE — Delete a saved place (requires ?id=<uuid>)
 *
 * Home rows (`is_home = true`) are immutable through this route — any
 * create/update/delete attempt on a home row returns HTTP 403.
 *
 * Security:
 *  - 401 when unauthenticated.
 *  - RLS on `user_locations` enforces `auth.uid() = user_id` at the DB.
 *  - PII (address, lat, lng, zip) is NEVER logged.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listPlaces,
  createPlace,
  updatePlace,
  deletePlace,
} from "@/lib/saved-places";
import type {
  CreatePlaceInput,
  UpdatePlaceInput,
} from "@/lib/saved-places";

interface ErrorResponse {
  success: false;
  error: string;
}

async function authenticate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Unauthorized" } satisfies ErrorResponse,
    { status: 401 },
  );
}

/* ------------------------------------------------------------------ */
/* GET /api/locations                                                  */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();
    if (!user) return unauthorized();

    const places = await listPlaces(supabase, user.id);
    return NextResponse.json({ success: true, places });
  } catch (err) {
    // Log only the generic error message — never include PII from rows.
    console.error(
      "Saved places list error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/locations                                                 */
/* ------------------------------------------------------------------ */

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();
    if (!user) return unauthorized();

    const body = (await request.json()) as CreatePlaceInput;
    const result = await createPlace(supabase, user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, place: result.place });
  } catch (err) {
    console.error(
      "Saved places create error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* PATCH /api/locations?id=<uuid>                                      */
/* ------------------------------------------------------------------ */

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();
    if (!user) return unauthorized();

    const url = new URL(request.url);
    const placeId = url.searchParams.get("id");
    if (!placeId) {
      return NextResponse.json(
        { success: false, error: "Place ID is required" } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const body = (await request.json()) as UpdatePlaceInput;
    const result = await updatePlace(supabase, placeId, user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status: result.status ?? 400 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "Saved places update error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* DELETE /api/locations?id=<uuid>                                     */
/* ------------------------------------------------------------------ */

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();
    if (!user) return unauthorized();

    const url = new URL(request.url);
    const placeId = url.searchParams.get("id");
    if (!placeId) {
      return NextResponse.json(
        { success: false, error: "Place ID is required" } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const result = await deletePlace(supabase, placeId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status: result.status ?? 400 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "Saved places delete error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}
