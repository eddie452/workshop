import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureAvailable } from "@/lib/subscription";
import { listChildren } from "@/lib/child-profiles";
import { ChildrenManager } from "@/components/children";

/**
 * /children — Child Profiles Management Page
 *
 * Allows Family-tier parents to manage up to 5 child profiles.
 * Each child gets independent Elo ratings, check-ins, and leaderboard.
 *
 * Gate: madness_family subscription tier.
 */
export default async function ChildrenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check family tier access
  const hasAccess = await isFeatureAvailable(supabase, user.id, "child_profiles");

  // Fetch children if the user has access
  let children: Awaited<ReturnType<typeof listChildren>> = [];
  if (hasAccess) {
    try {
      children = await listChildren(supabase, user.id);
    } catch {
      // Graceful — empty list shown
    }
  }

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8"
      style={{
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Child Profiles
        </h1>
        <p
          className="mt-1 text-sm text-gray-600"
          style={{
            fontSize: "0.875rem",
            color: "#4b5563",
            margin: "0.25rem 0 0 0",
          }}
        >
          Track allergies independently for each child in your family.
        </p>
      </div>

      <ChildrenManager
        initialChildren={children}
        hasAccess={hasAccess}
      />
    </div>
  );
}
