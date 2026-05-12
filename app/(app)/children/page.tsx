import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listChildren } from "@/lib/child-profiles";
import { ChildrenManager } from "@/components/children";
import { PageContainer } from "@/components/layout";

/**
 * /children — Child Profiles Management Page
 *
 * Allows parents to manage up to 5 child profiles.
 * Each child gets independent Elo ratings, check-ins, and leaderboard.
 *
 * Strategic shift (#288): Family-tier gate removed. Every authenticated
 * user can manage child profiles.
 */
export default async function ChildrenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Always fetch children — no tier gate.
  let children: Awaited<ReturnType<typeof listChildren>> = [];
  try {
    children = await listChildren(supabase, user.id);
  } catch {
    // Graceful — empty list shown
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-bold text-dusty-denim">
          Child Profiles
        </h1>
        <p className="mt-1 mb-0 text-sm text-dusty-denim">
          Track allergies independently for each child in your family.
        </p>
      </div>

      <ChildrenManager
        initialChildren={children}
        hasAccess={true}
      />
    </PageContainer>
  );
}
