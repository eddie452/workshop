"use client";

/**
 * ProfileSwitcher
 *
 * Dropdown component that allows parents to switch between self and
 * child profiles for check-ins and leaderboard viewing.
 *
 * Accessible from the dashboard header.
 */

import { useState } from "react";
import type { ChildProfileSummary } from "@/lib/child-profiles/types";

export interface ProfileSwitcherProps {
  /** Currently selected profile (null = parent/self) */
  activeChildId: string | null;
  /** List of child profiles */
  childProfiles: ChildProfileSummary[];
  /** Parent display name or email */
  parentLabel: string;
  /** Callback when profile is switched */
  onSwitch: (childId: string | null) => void;
}

export function ProfileSwitcher({
  activeChildId,
  childProfiles,
  parentLabel,
  onSwitch,
}: ProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeLabel = activeChildId
    ? childProfiles.find((c) => c.id === activeChildId)?.name ?? "Child"
    : parentLabel;

  if (childProfiles.length === 0) {
    return null;
  }

  return (
    <div data-testid="profile-switcher" className="relative">
      <button
        type="button"
        data-testid="profile-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-button border border-champ-blue bg-white px-3 py-2 text-sm font-medium text-dusty-denim shadow-sm hover:bg-white"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-champ-blue text-xs font-bold text-white">
          {activeLabel.charAt(0).toUpperCase()}
        </span>
        <span>{activeLabel}</span>
        <svg
          className={`h-4 w-4 text-dusty-denim transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          data-testid="profile-switcher-menu"
          className="absolute left-0 z-10 mt-1 w-56 rounded-card border border-champ-blue bg-white py-1 shadow-lg"
        >
          {/* Parent/Self option */}
          <button
            type="button"
            data-testid="profile-option-self"
            onClick={() => {
              onSwitch(null);
              setIsOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
              activeChildId === null
                ? "bg-champ-blue font-semibold text-white"
                : "text-dusty-denim hover:bg-white"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-dusty-denim">
              {parentLabel.charAt(0).toUpperCase()}
            </span>
            {parentLabel} (Me)
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-champ-blue" />

          {/* Child options */}
          {childProfiles.map((child) => (
            <button
              key={child.id}
              type="button"
              data-testid={`profile-option-${child.id}`}
              onClick={() => {
                onSwitch(child.id);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                activeChildId === child.id
                  ? "bg-champ-blue font-semibold text-white"
                  : "text-dusty-denim hover:bg-white"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-champ-blue text-xs font-bold text-white">
                {child.name.charAt(0).toUpperCase()}
              </span>
              {child.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
