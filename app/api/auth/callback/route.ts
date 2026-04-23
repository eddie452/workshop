import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback handler for email confirmation flows.
 *
 * Supabase sends the user here after they click a confirmation link.
 * We exchange the auth code for a session and redirect the user to
 * the correct landing surface:
 *
 *   - Completed onboarding (user_profiles.home_region is set) → /dashboard
 *   - No profile / incomplete onboarding → /onboarding
 *
 * This is defense-in-depth with the middleware onboarding guard
 * (issue #282). Without this check, a fresh signup landed on an empty
 * /dashboard because no `user_profiles` row existed yet, which also
 * cascaded into `symptom_checkins_user_id_fkey` FK violations.
 *
 * An explicit `?next=` override is honored only when the user is
 * already onboarded — otherwise we always route to `/onboarding`
 * first.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = nextParam ?? "/dashboard";

      if (user) {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("home_region")
          .eq("id", user.id)
          .maybeSingle();

        const profile = profileData as { home_region: string | null } | null;
        if (!profile?.home_region) {
          destination = "/onboarding";
        }
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login`);
}
