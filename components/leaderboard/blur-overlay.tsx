/**
 * Blur Overlay
 *
 * Freemium gate overlay that blurs content for free-tier users.
 * Shows a lock icon with pulse animation and upgrade prompt.
 */

import type { BlurOverlayProps } from "./types";

export function BlurOverlay({ children }: BlurOverlayProps) {
  return (
    <div
      data-testid="blur-overlay"
      className="relative"
      style={{ position: "relative" }}
    >
      {/* Blurred content */}
      <div
        className="pointer-events-none select-none blur-md"
        style={{
          filter: "blur(8px)",
          pointerEvents: "none",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div
        data-testid="blur-lock-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="mb-2 text-3xl"
          style={{
            fontSize: "1.875rem",
            marginBottom: "0.5rem",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
          aria-hidden="true"
        >
          &#x1F512;
        </span>
        <p
          className="text-sm font-medium text-gray-600"
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#4b5563",
          }}
        >
          Upgrade to Madness+ to reveal
        </p>
      </div>
    </div>
  );
}
