import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlaces } from "@/lib/saved-places";
import { PlacesManager } from "@/components/places";
import { PageContainer } from "@/components/layout";

/**
 * /places — Saved Places Management Page
 *
 * Lists and manages saved (non-home) locations. Home location is NOT
 * editable on this page — it is managed by onboarding.
 */
export default async function PlacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let places: Awaited<ReturnType<typeof listPlaces>> = [];
  try {
    places = await listPlaces(supabase, user.id);
  } catch {
    // Graceful — empty list shown
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-bold text-brand-primary-dark">
          Saved Places
        </h1>
        <p className="mt-1 mb-0 text-sm text-brand-text-secondary">
          Track allergen exposure at recurring locations like a grandparent&apos;s
          house or a vacation home.
        </p>
      </div>

      <PlacesManager initialPlaces={places} />
    </PageContainer>
  );
}
