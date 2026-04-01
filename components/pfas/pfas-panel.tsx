"use client";

/**
 * PFAS Panel
 *
 * Displays food cross-reactivity information for allergens in the
 * user's top 5. Shows which foods may trigger oral allergy symptoms
 * based on pollen-food allergy syndrome (PFAS) data.
 *
 * Premium feature — gated behind Madness+ subscription.
 * Free-tier users see allergen names but food lists are blurred.
 */

import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { BlurOverlay } from "@/components/leaderboard/blur-overlay";
import { CategoryIcon } from "@/components/leaderboard/category-icon";
import { UpgradeCta } from "@/components/subscription/upgrade-cta";
import type { PfasCrossReactivity } from "@/lib/pfas/types";
import type { PfasSeverity } from "@/lib/supabase/types";

export interface PfasPanelProps {
  /** Cross-reactivity entries for top allergens */
  entries: PfasCrossReactivity[];
  /** Whether the user has premium access */
  isPremium: boolean;
}

const SEVERITY_LABELS: Record<PfasSeverity, string> = {
  mild_oas: "Mild OAS",
  moderate: "Moderate",
  systemic_risk: "Systemic Risk",
  none: "None",
};

const SEVERITY_COLORS: Record<
  PfasSeverity,
  { bg: string; text: string; border: string }
> = {
  mild_oas: {
    bg: "#fef9c3",
    text: "#854d0e",
    border: "#fde68a",
  },
  moderate: {
    bg: "#ffedd5",
    text: "#9a3412",
    border: "#fed7aa",
  },
  systemic_risk: {
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fecaca",
  },
  none: {
    bg: "#D6F0F8",
    text: "#056DA5",
    border: "#B8E4F0",
  },
};

function SeverityBadge({ severity }: { severity: PfasSeverity }) {
  const colors = SEVERITY_COLORS[severity];
  return (
    <span
      data-testid="pfas-severity-badge"
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

function FoodTag({ food }: { food: string }) {
  return (
    <span
      data-testid="pfas-food-tag"
      className="inline-block rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800"
    >
      {food}
    </span>
  );
}

function AllergenCrossReactivityCard({
  entry,
  isPremium,
}: {
  entry: PfasCrossReactivity;
  isPremium: boolean;
}) {
  const foodContent = (
    <div className="flex flex-wrap gap-2">
      {entry.cross_reactive_foods.map((food) => (
        <FoodTag key={food} food={food} />
      ))}
    </div>
  );

  return (
    <div
      data-testid="pfas-allergen-card"
      className="rounded-lg border border-brand-border bg-white p-4"
    >
      {/* Allergen header — always visible */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon category={entry.category} />
          <span className="text-sm font-semibold text-brand-primary-dark">
            {entry.common_name}
          </span>
        </div>
        <SeverityBadge severity={entry.pfas_severity} />
      </div>

      {/* Food list — blurred for free tier */}
      <div>
        <p className="mb-2 text-xs font-medium text-brand-text-muted">
          Cross-reactive foods
        </p>
        {isPremium ? (
          foodContent
        ) : (
          <BlurOverlay featureLabel="food cross-reactivity details">
            {foodContent}
          </BlurOverlay>
        )}
      </div>
    </div>
  );
}

export function PfasPanel({ entries, isPremium }: PfasPanelProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="pfas-panel"
      aria-label="Food cross-reactivity panel"
      className="space-y-4"
    >
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold text-brand-text">
          Food Cross-Reactivity (PFAS)
        </h2>
        <p className="mt-1 text-xs text-brand-text-muted">
          Foods that may trigger oral symptoms due to pollen-food allergy
          syndrome
        </p>
      </div>

      {/* FDA Disclaimer — required on health-adjacent content */}
      <FdaDisclaimer variant="compact" />

      {/* Cross-reactivity cards */}
      {entries.map((entry) => (
        <AllergenCrossReactivityCard
          key={entry.allergen_id}
          entry={entry}
          isPremium={isPremium}
        />
      ))}

      {/* Upgrade CTA for free users */}
      {!isPremium && (
        <div
          data-testid="pfas-upgrade-cta"
          className="mt-2"
        >
          <UpgradeCta feature="food cross-reactivity details" />
        </div>
      )}
    </section>
  );
}
