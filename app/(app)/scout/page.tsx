import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { ScanForm } from "@/components/scout/scan-form";

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
    <div
      className="mx-auto max-w-md px-4 py-8"
      style={{
        maxWidth: "28rem",
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      {/* Header */}
      <div
        className="mb-6"
        style={{ marginBottom: "1.5rem" }}
      >
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 0.25rem 0",
          }}
        >
          Trigger Scout
        </h1>
        <p
          className="text-sm text-gray-600"
          style={{
            fontSize: "0.875rem",
            color: "#4b5563",
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
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          style={{
            fontSize: "0.875rem",
            color: "#2563eb",
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
