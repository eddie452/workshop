import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { ScanForm } from "@/components/scout/scan-form";
import { PageContainer } from "@/components/layout";

/**
 * /scout — Trigger Scout Page
 *
 * Server component that:
 * 1. Verifies authentication
 * 2. Renders the camera/upload UI with FDA disclaimer
 *
 * Users photograph suspected allergen-producing plants. The server
 * identifies them via Google Cloud Vision AI and matches against
 * the allergen database. When conditions are met (symptoms present
 * + seasonal confirmation), a 2.5x Elo proximity multiplier is applied.
 */

export default async function ScoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PageContainer width="sm">
      {/* Header */}
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-2xl font-bold text-brand-primary-dark">
          Trigger Scout
        </h1>
        <p className="m-0 text-sm text-brand-text-secondary">
          Photograph a plant you suspect causes reactions. AI will identify it
          and check it against your allergen profile.
        </p>
      </div>

      {/* FDA Disclaimer */}
      <div className="mb-6">
        <FdaDisclaimer variant="compact" />
      </div>

      {/* Scan Form */}
      <ScanForm />

      {/* Navigation back to dashboard */}
      <div className="mt-6 text-center">
        <a
          href="/dashboard"
          className="text-sm text-brand-primary no-underline hover:text-brand-primary-dark hover:underline"
        >
          Back to Dashboard
        </a>
      </div>
    </PageContainer>
  );
}
