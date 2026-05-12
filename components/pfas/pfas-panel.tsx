"use client";

/**
 * PFAS Panel
 *
 * Displays food cross-reactivity information for allergens in the
 * user's top 5. Shows which foods may trigger oral allergy symptoms
 * based on pollen-food allergy syndrome (PFAS) data.
 *
 * Strategic shift (#288): premium gating removed. Every user sees
 * the full cross-reactive food list. The `isPremium` prop is kept
 * for backwards compatibility with the call sites but no longer
 * blurs the food list or renders an upgrade CTA.
 */

import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import { CategoryIcon } from "@/components/leaderboard/category-icon";
import type { PfasCrossReactivity } from "@/lib/pfas/types";
import type { PfasSeverity } from "@/lib/supabase/types";

export interface PfasPanelProps {
  /** Cross-reactivity entries for top allergens */
  entries: PfasCrossReactivity[];
  /** Retained for backwards compatibility; no longer gates rendering. */
  isPremium?: boolean;
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
    bg: "#E0F5FB",
    text: "#0682BB",
    border: "#B8E4F0",
  },
  moderate: {
    bg: "#D6F0F8",
    text: "#056DA5",
    border: "#B8E4F0",
  },
  systemic_risk: {
    bg: "#0682BB",
    text: "#FFFFFF",
    border: "#056DA5",
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
      className="inline-block rounded-full border border-champ-blue bg-white px-2 py-1 text-xs font-medium text-dusty-denim"
    >
      {food}
    </span>
  );
}

function AllergenCrossReactivityCard({
  entry,
}: {
  entry: PfasCrossReactivity;
}) {
  return (
    <div
      data-testid="pfas-allergen-card"
      className="rounded-card border border-champ-blue bg-white p-4"
    >
      {/* Allergen header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon category={entry.category} />
          <span className="text-sm font-semibold text-dusty-denim">
            {entry.common_name}
          </span>
        </div>
        <SeverityBadge severity={entry.pfas_severity} />
      </div>

      {/* Food list — visible to all users (#288) */}
      <div>
        <p className="mb-2 text-xs font-medium text-dusty-denim">
          Cross-reactive foods
        </p>
        <div className="flex flex-wrap gap-2">
          {entry.cross_reactive_foods.map((food) => (
            <FoodTag key={food} food={food} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PfasPanel({ entries }: PfasPanelProps) {
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
        <h2 className="text-lg font-semibold text-dusty-denim">
          Food Cross-Reactivity (PFAS)
        </h2>
        <p className="mt-1 text-xs text-dusty-denim">
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
        />
      ))}
    </section>
  );
}
