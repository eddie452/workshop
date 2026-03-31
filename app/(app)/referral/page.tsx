/**
 * Referral Page
 *
 * Server component that loads the user's referral status and renders
 * the referral progress tracker and share components.
 *
 * IMPORTANT: income_tier is NEVER included in any data passed to client.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReferralStatus } from "@/lib/referral";
import { ReferralProgress } from "@/components/referral/referral-progress";
import { ReferralPageClient } from "./referral-page-client";

export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const status = await getReferralStatus(supabase, user.id);

  return (
    <div
      className="mx-auto max-w-md space-y-6 px-4 py-8"
      style={{
        maxWidth: "28rem",
        marginLeft: "auto",
        marginRight: "auto",
        padding: "2rem 1rem",
      }}
    >
      <div>
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Invite Friends
        </h1>
        <p
          className="mt-1 text-sm text-gray-500"
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginTop: "0.25rem",
          }}
        >
          Share Allergy Madness with friends and unlock all features for free.
        </p>
      </div>

      <ReferralProgress
        referralCount={status.referral_count}
        featuresUnlocked={status.features_unlocked}
      />

      <ReferralPageClient referralCode={status.referral_code} />
    </div>
  );
}
