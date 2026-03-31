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
 *
 * Dual styling: Tailwind utility classes + inline styles.
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
    bg: "#f3f4f6",
    text: "#374151",
    border: "#e5e7eb",
  },
};

function SeverityBadge({ severity }: { severity: PfasSeverity }) {
  const colors = SEVERITY_COLORS[severity];
  return (
    <span
      data-testid="pfas-severity-badge"
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "9999px",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        paddingTop: "0.125rem",
        paddingBottom: "0.125rem",
        fontSize: "0.75rem",
        fontWeight: 500,
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
      className="inline-block rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-800"
      style={{
        display: "inline-block",
        borderRadius: "0.375rem",
        backgroundColor: "#f0fdf4",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        paddingTop: "0.25rem",
        paddingBottom: "0.25rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        color: "#166534",
        border: "1px solid #bbf7d0",
      }}
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
    <div
      className="flex flex-wrap gap-2"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      {entry.cross_reactive_foods.map((food) => (
        <FoodTag key={food} food={food} />
      ))}
    </div>
  );

  return (
    <div
      data-testid="pfas-allergen-card"
      className="rounded-lg border border-gray-200 bg-white p-4"
      style={{
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: "1rem",
      }}
    >
      {/* Allergen header — always visible */}
      <div
        className="mb-3 flex items-center justify-between"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <CategoryIcon category={entry.category} />
          <span
            className="text-sm font-semibold text-gray-900"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {entry.common_name}
          </span>
        </div>
        <SeverityBadge severity={entry.pfas_severity} />
      </div>

      {/* Food list — blurred for free tier */}
      <div>
        <p
          className="mb-2 text-xs font-medium text-gray-500"
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "#6b7280",
            marginBottom: "0.5rem",
          }}
        >
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Section header */}
      <div>
        <h2
          className="text-lg font-semibold text-gray-800"
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "#1f2937",
            margin: 0,
          }}
        >
          Food Cross-Reactivity (PFAS)
        </h2>
        <p
          className="mt-1 text-xs text-gray-500"
          style={{
            fontSize: "0.75rem",
            color: "#6b7280",
            marginTop: "0.25rem",
          }}
        >
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
          style={{ marginTop: "0.5rem" }}
        >
          <UpgradeCta feature="food cross-reactivity details" />
        </div>
      )}
    </section>
  );
}
