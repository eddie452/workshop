import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Supabase middleware helper.
 *
 * Refreshes the auth session on every request so cookies stay fresh.
 * Returns the updated response with refreshed cookies, plus a lightweight
 * onboarding-completion flag for the authenticated user (issue #282).
 *
 * `hasOnboardingProfile` is `true` when the user has a `user_profiles`
 * row with a non-null `home_region`. It is `null` when the user is
 * unauthenticated or when the lookup fails (fail-open: middleware will
 * not force a redirect on transient DB errors — downstream server
 * components re-check as defense-in-depth).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasOnboardingProfile: boolean | null = null;
  if (user) {
    // Single-column lookup — minimal overhead per request. We do NOT
    // log the value (home_region is user-provided; HIPAA: no profile
    // content in logs). Errors are swallowed: middleware falls back to
    // null (treat as "unknown") and lets the page-level guards enforce.
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("home_region")
        .eq("id", user.id)
        .maybeSingle();
      const profile = data as { home_region: string | null } | null;
      hasOnboardingProfile = Boolean(profile?.home_region);
    } catch {
      hasOnboardingProfile = null;
    }
  }

  return { user, supabaseResponse, hasOnboardingProfile };
}
