import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding";

/**
 * Onboarding Page
 *
 * The first user experience after login. Collects minimal info and
 * auto-populates as much as possible from geocoding, BatchData, and
 * Census APIs.
 *
 * If the user has already completed onboarding (has a home_region),
 * redirects to /dashboard.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has already completed onboarding
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("home_region")
    .eq("id", user.id)
    .single();

  const profile = profileData as { home_region: string | null } | null;
  if (profile?.home_region) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white">
      <OnboardingWizard />
    </main>
  );
}
