import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * Must be called inside a request context (where `cookies()` is available).
 * The cookie adapter ensures Supabase Auth tokens are forwarded to the
 * database, so RLS policies apply to the authenticated user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll can be called from a Server Component where cookies
            // are read-only. The middleware refresh will handle it.
          }
        },
      },
    },
  );
}
