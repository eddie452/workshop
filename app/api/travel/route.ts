/**
 * /api/travel — Travel Mode activation
 *
 * POST   — Activate travel mode for a given lat/lng. Seeds location-scoped
 *          Elo. Returns 409 if an active session already exists.
 * DELETE — Deactivate the current active session (sets ended_at).
 * GET    — Return the current active session, or `{ session: null }`.
 *
 * Ticket: #223 — Travel Mode API + schema
 *
 * Auth: all methods require a Supabase user. Server-only — do not import
 * from a client component.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  activateTravel,
  deactivateTravel,
  getActiveSession,
} from "@/lib/travel";
import type { ActivateTravelInput } from "@/lib/travel";
import { logger } from "@/lib/logger";

interface ErrorResponse {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/* GET /api/travel — current active session                           */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    const session = await getActiveSession(supabase, user.id);
    return NextResponse.json({ success: true, session });
  } catch (err) {
    logger.error("Travel GET error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/travel — activate                                         */
/* ------------------------------------------------------------------ */

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    let body: ActivateTravelInput;
    try {
      body = (await request.json()) as ActivateTravelInput;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const result = await activateTravel(supabase, user.id, body);

    if (!result.success) {
      const status =
        result.code === "validation"
          ? 400
          : result.code === "active_session_exists"
            ? 409
            : 500;
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status },
      );
    }

    return NextResponse.json({ success: true, session: result.session });
  } catch (err) {
    logger.error("Travel POST error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* DELETE /api/travel — deactivate                                     */
/* ------------------------------------------------------------------ */

export async function DELETE(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    const result = await deactivateTravel(supabase, user.id);
    if (!result.success) {
      const status = result.code === "no_active_session" ? 404 : 500;
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status },
      );
    }

    return NextResponse.json({ success: true, session: result.session });
  } catch (err) {
    logger.error("Travel DELETE error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}
