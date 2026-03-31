"use client";

/**
 * Referral Page Client Component
 *
 * Wraps the ReferralShare component in a client boundary so it can
 * use window.location.origin for referral link generation.
 */

import { ReferralShare } from "@/components/referral/referral-share";

interface ReferralPageClientProps {
  referralCode: string;
}

export function ReferralPageClient({ referralCode }: ReferralPageClientProps) {
  return <ReferralShare referralCode={referralCode} />;
}
