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
  /** Champ Blue (Pantone 306 C) — primary actions, links, active states */
  primary: "#00B6E2",
  primaryLight: "#E0F5FB",
  primaryDark: "#0682BB",

  /** Nature Pop (Pantone 381 C) — CTAs, eye-catching contrast */
  accent: "#CCDC29",
  accentLight: "#F5F8D9",
  accentDark: "#B0C020",

  /** FDA disclaimer amber — warnings, regulatory notices */
  warning: "#d97706",
  warningLight: "#fffbeb",
  warningDark: "#92400e",

  /** Alert red — errors, destructive actions */
  error: "#dc2626",
  errorLight: "#fef2f2",
  errorDark: "#991b1b",

  /**
   * Dusty Denim deep — premium features, upgrade prompts.
   * Intentionally close to primaryDark (#0682BB → Dusty Denim family);
   * per the brand guide, Dusty Denim IS the premium color palette.
   */
  premium: "#055A8C",
  premiumLight: "#E0F0F8",
  premiumDark: "#045A82",

  /** Surface — backgrounds, NO GRAY */
  surface: "#ffffff",
  surfaceMuted: "#F0F9FC",

  /** Borders — light blue tints, NO GRAY */
  border: "#B8E4F0",
  borderLight: "#D6F0F8",

  /** Text hierarchy — NO BLACK, Dusty Denim based (WCAG AA compliant) */
  text: "#045A82",
  textSecondary: "#056DA5",
  textMuted: "#0678B1",
  textFaint: "#0776A8",

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
  primary: [0, 182, 226] as const,       // Champ Blue #00B6E2
  gold: [234, 179, 8] as const,
  text: [4, 90, 130] as const,             // #045A82
  textSecondary: [5, 109, 165] as const,  // #056DA5
  textMuted: [6, 120, 177] as const,      // Dusty Denim #0678B1
  border: [184, 228, 240] as const,       // #B8E4F0
  bgLight: [240, 249, 252] as const,      // #F0F9FC
  amberBg: [255, 251, 235] as const,
  amberText: [146, 64, 14] as const,
  white: [255, 255, 255] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Type exports                                                        */
/* ------------------------------------------------------------------ */

export type BrandColor = keyof typeof BRAND_COLORS;
export type PdfColor = keyof typeof PDF_COLORS;
