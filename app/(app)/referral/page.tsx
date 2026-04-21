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
import { PageContainer } from "@/components/layout";

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
    <PageContainer width="sm" className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-bold text-dusty-denim">
          Invite Friends
        </h1>
        <p className="mt-1 mb-0 text-sm text-dusty-denim">
          Share Allergy Madness with friends and unlock all features for free.
        </p>
      </div>

      <ReferralProgress
        referralCount={status.referral_count}
        featuresUnlocked={status.features_unlocked}
      />

      <ReferralPageClient referralCode={status.referral_code} />
    </PageContainer>
  );
}
