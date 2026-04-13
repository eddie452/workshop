/**
 * PageContainer
 *
 * Reusable layout wrapper for authenticated app pages.
 * Provides centered, max-width-constrained content with consistent padding.
 *
 * Replaces repeated inline `mx-auto max-w-2xl px-4 py-8` patterns
 * across dashboard, checkin, children, referral, and scout pages.
 */

export type ContainerWidth = "sm" | "md" | "lg";

const WIDTH_CLASSES: Record<ContainerWidth, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

export interface PageContainerProps {
  /** Max-width preset: "sm" (28rem), "md" (42rem), "lg" (48rem). Default: "md" */
  width?: ContainerWidth;
  /** Additional CSS classes */
  className?: string;
  children: React.ReactNode;
}

export function PageContainer({
  width = "md",
  className = "",
  children,
}: PageContainerProps) {
  return (
    <div
      data-testid="page-container"
      className={`mx-auto ${WIDTH_CLASSES[width]} px-4 py-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
