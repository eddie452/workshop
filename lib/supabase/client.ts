import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client.
 *
 * Safe to call from client components. Uses the public anon key only.
 * RLS policies enforce access control — no service-role key here.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
