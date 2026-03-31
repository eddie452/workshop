import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { CheckinForm } from "@/components/checkin/checkin-form";

/**
 * /checkin — Daily Check-in Page
 *
 * Server component that:
 * 1. Verifies authentication
 * 2. Checks if user already checked in today
 * 3. Renders the check-in form with FDA disclaimer
 */

export default async function CheckinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if already checked in today (UTC day boundaries)
  const today = new Date();
  const startOfDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  ).toISOString();
  const endOfDay = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + 1,
    ),
  ).toISOString();

  type CountQuery = {
    select: (
      cols: string,
      opts: { count: string; head: boolean },
    ) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          gte: (col: string, val: string) => {
            lt: (col: string, val: string) => Promise<{ count: number | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  const { count } = await (
    supabase.from("symptom_checkins") as unknown as CountQuery
  )
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("child_id", null)
    .gte("checked_in_at", startOfDay)
    .lt("checked_in_at", endOfDay);

  const alreadyCheckedIn = (count ?? 0) > 0;

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
          Daily Check-in
        </h1>
        <p
          className="text-sm text-gray-600"
          style={{
            fontSize: "0.875rem",
            color: "#4b5563",
            margin: 0,
          }}
        >
          How are your allergies today? Your response updates the leaderboard.
        </p>
      </div>

      {/* FDA Disclaimer */}
      <div
        className="mb-6"
        style={{ marginBottom: "1.5rem" }}
      >
        <FdaDisclaimer variant="compact" />
      </div>

      {/* Check-in form */}
      <CheckinForm alreadyCheckedIn={alreadyCheckedIn} />

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
