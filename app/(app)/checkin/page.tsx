import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { CheckinForm } from "@/components/checkin/checkin-form";
import { PageContainer } from "@/components/layout";

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
    <PageContainer width="sm">
      {/* Header */}
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-2xl font-bold text-brand-primary-dark">
          Daily Check-in
        </h1>
        <p className="m-0 text-sm text-brand-text-secondary">
          How are your allergies today? Your response updates the leaderboard.
        </p>
      </div>

      {/* FDA Disclaimer */}
      <div className="mb-6">
        <FdaDisclaimer variant="compact" />
      </div>

      {/* Check-in form */}
      <CheckinForm alreadyCheckedIn={alreadyCheckedIn} />

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
