/**
 * Champ Health Brand Color Tokens
 *
 * Server-side color constants for PDF reports and non-CSS contexts.
 * These values MUST stay in sync with the CSS custom properties
 * defined in app/globals.css.
 *
 * For UI components, use Tailwind utility classes instead:
 *   bg-brand-primary, text-brand-accent, border-brand-warning, etc.
 *
 * For PDF generation (jsPDF), use the RGB tuples exported here.
 */

/* ------------------------------------------------------------------ */
/* Hex values (for any server-side string context)                     */
/* ------------------------------------------------------------------ */

export const BRAND_COLORS = {
  /** Health-forward blue — primary actions, links, active states */
  primary: "#2563eb",
  primaryLight: "#dbeafe",
  primaryDark: "#1d4ed8",

  /** Wellness green — success states, positive indicators */
  accent: "#16a34a",
  accentLight: "#dcfce7",
  accentDark: "#15803d",

  /** FDA disclaimer amber — warnings, regulatory notices */
  warning: "#d97706",
  warningLight: "#fffbeb",
  warningDark: "#92400e",

  /** Alert red — errors, destructive actions */
  error: "#dc2626",
  errorLight: "#fef2f2",
  errorDark: "#991b1b",

  /** Madness+ purple — premium features, upgrade prompts */
  premium: "#9333ea",
  premiumLight: "#faf5ff",
  premiumDark: "#581c87",

  /** Surface — backgrounds */
  surface: "#ffffff",
  surfaceMuted: "#f9fafb",

  /** Borders */
  border: "#e5e7eb",
  borderLight: "#f3f4f6",

  /** Text hierarchy */
  text: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",

  /** Champion gold — trigger champion card */
  gold: "#eab308",
  goldLight: "#fffbeb",
  goldDark: "#b45309",
  goldBorder: "#fbbf24",
} as const;

/* ------------------------------------------------------------------ */
/* RGB tuples for jsPDF (0-255)                                        */
/* ------------------------------------------------------------------ */

export const PDF_COLORS = {
  primary: [37, 99, 235] as const,
  gold: [234, 179, 8] as const,
  text: [17, 24, 39] as const,
  textSecondary: [31, 41, 55] as const,
  textMuted: [107, 114, 128] as const,
  border: [209, 213, 219] as const,
  bgLight: [249, 250, 251] as const,
  amberBg: [255, 251, 235] as const,
  amberText: [146, 64, 14] as const,
  white: [255, 255, 255] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Type exports                                                        */
/* ------------------------------------------------------------------ */

export type BrandColor = keyof typeof BRAND_COLORS;
export type PdfColor = keyof typeof PDF_COLORS;
