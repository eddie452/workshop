"use client";

/**
 * RevealGate
 *
 * Small reusable primitive that renders a labeled button which, on
 * click, reveals its children beneath. Used by the dashboard (ticket
 * #242) to defer rendering of the bracket and full rankings until the
 * user opts in.
 *
 * Accessibility:
 * - Uses a real `<button>` element
 * - `aria-expanded` reflects the current reveal state
 * - `aria-controls` points at the container ID holding `children`
 *
 * State:
 * - Purely ephemeral `useState` — deliberately not persisted across
 *   page reloads.
 */

import { useId, useState, type ReactNode } from "react";

export interface RevealGateProps {
  /** Label shown on the button before the content is revealed. */
  label: string;
  /**
   * Optional label shown once the content is revealed (acts as a
   * "hide" toggle). When omitted, the button is removed from the DOM
   * after reveal so the surface stays uncluttered.
   */
  hideLabel?: string;
  /** The content to reveal on click. */
  children: ReactNode;
  /** Optional test id for the wrapper element. */
  "data-testid"?: string;
  /** Optional CSS classes applied to the button. */
  buttonClassName?: string;
}

export function RevealGate({
  label,
  hideLabel,
  children,
  "data-testid": dataTestId,
  buttonClassName,
}: RevealGateProps) {
  const [revealed, setRevealed] = useState(false);
  const panelId = useId();

  const defaultButtonClasses =
    "inline-flex items-center justify-center rounded-card border border-champ-blue bg-white px-4 py-2 text-sm font-semibold text-dusty-denim hover:bg-white";

  return (
    <div data-testid={dataTestId}>
      {(!revealed || hideLabel) && (
        <button
          type="button"
          aria-expanded={revealed}
          aria-controls={panelId}
          onClick={() => setRevealed((v) => !v)}
          className={buttonClassName ?? defaultButtonClasses}
        >
          {revealed && hideLabel ? hideLabel : label}
        </button>
      )}
      <div id={panelId} hidden={!revealed}>
        {revealed ? children : null}
      </div>
    </div>
  );
}
