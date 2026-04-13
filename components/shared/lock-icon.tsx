/**
 * Shared Lock Icon
 *
 * Reusable SVG lock icon used across premium/freemium gates.
 * Accepts configurable size and stroke properties.
 */

export interface LockIconProps {
  /** Icon width and height in pixels */
  size?: number;
  /** SVG stroke color */
  stroke?: string;
  /** SVG stroke width */
  strokeWidth?: number;
  /** Additional class names */
  className?: string;
}

export function LockIcon({
  size = 24,
  stroke = "currentColor",
  strokeWidth = 2,
  className,
}: LockIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
