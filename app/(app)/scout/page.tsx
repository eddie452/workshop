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
      <div
        className="mb-6"
        style={{ marginBottom: "1.5rem" }}
      >
        <h1
          className="text-2xl font-bold text-brand-primary-dark"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#045A82",
            margin: "0 0 0.25rem 0",
          }}
        >
          Trigger Scout
        </h1>
        <p
          className="text-sm text-brand-text-secondary"
          style={{
            fontSize: "0.875rem",
            color: "#056DA5",
            margin: 0,
          }}
        >
          Photograph a plant you suspect causes reactions. AI will identify it
          and check it against your allergen profile.
        </p>
      </div>

      {/* FDA Disclaimer */}
      <div
        className="mb-6"
        style={{ marginBottom: "1.5rem" }}
      >
        <FdaDisclaimer variant="compact" />
      </div>

      {/* Scan Form */}
      <ScanForm />

      {/* Navigation back to dashboard */}
      <div
        className="mt-6 text-center"
        style={{ marginTop: "1.5rem", textAlign: "center" }}
      >
        <a
          href="/dashboard"
          className="text-sm text-brand-primary hover:text-brand-primary-dark hover:underline"
          style={{
            fontSize: "0.875rem",
            color: "#00B6E2",
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </a>
      </div>
    </PageContainer>
  );
}
