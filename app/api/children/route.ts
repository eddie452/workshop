/**
 * /api/children — Child Profiles CRUD
 *
 * GET    — List all child profiles for the authenticated parent
 * POST   — Create a new child profile
 * PATCH  — Update an existing child profile (requires ?id=<child_id>)
 * DELETE — Delete a child profile (requires ?id=<child_id>)
 *
 * Strategic shift (#288): Family-tier gate removed. Any authenticated
 * user can manage their own child profiles. Ownership is enforced by
 * passing `user.id` through to the data-layer helpers (RLS-aligned).
 * IMPORTANT: income_tier is NEVER included in any API response.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listChildren,
  createChild,
  updateChild,
  deleteChild,
} from "@/lib/child-profiles";
import type { CreateChildInput, UpdateChildInput } from "@/lib/child-profiles";

/* ------------------------------------------------------------------ */
/* Response types                                                      */
/* ------------------------------------------------------------------ */

interface ErrorResponse {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function authenticate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}

/* ------------------------------------------------------------------ */
/* GET /api/children                                                   */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    const children = await listChildren(supabase, user.id);

    return NextResponse.json({
      success: true,
      children,
    });
  } catch (err) {
    console.error("Children list error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/children                                                  */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    const body: CreateChildInput = await request.json();

    const result = await createChild(supabase, user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      child: result.child,
    });
  } catch (err) {
    console.error("Children create error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* PATCH /api/children?id=<child_id>                                   */
/* ------------------------------------------------------------------ */

export async function PATCH(
  request: Request,
): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const childId = url.searchParams.get("id");

    if (!childId) {
      return NextResponse.json(
        { success: false, error: "Child ID is required" } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const body: UpdateChildInput = await request.json();

    const result = await updateChild(supabase, childId, user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Children update error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* DELETE /api/children?id=<child_id>                                   */
/* ------------------------------------------------------------------ */

export async function DELETE(
  request: Request,
): Promise<NextResponse> {
  try {
    const { supabase, user } = await authenticate();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ErrorResponse,
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const childId = url.searchParams.get("id");

    if (!childId) {
      return NextResponse.json(
        { success: false, error: "Child ID is required" } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const result = await deleteChild(supabase, childId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Children delete error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}
