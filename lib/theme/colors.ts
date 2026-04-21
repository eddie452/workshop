/**
 * Champ Health Brand Color Tokens
 *
 * Server-side color constants for PDF reports and non-CSS contexts.
 * These values MUST stay in sync with the CSS custom properties
 * defined in app/globals.css.
 *
 * For UI components, use the canonical 4-color Tailwind utilities:
 *   bg-champ-blue, bg-dusty-denim, bg-white, bg-nature-pop, text-alert-red
 * (Legacy aliases bg-brand-* continue to resolve to the canonical
 * tokens via app/globals.css — see epic #243.)
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

  /** Dusty Denim — warnings, regulatory notices */
  warning: "#0682BB",
  warningLight: "#E0F0F8",
  warningDark: "#055A8C",

  /** Dark Dusty Denim — errors, destructive actions */
  error: "#055A8C",
  errorLight: "#E0F0F8",
  errorDark: "#044A72",

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

  /** Dusty Denim champion — trigger champion card */
  champion: "#0682BB",
  championLight: "#E0F0F8",
  championDark: "#055A8C",
  championBorder: "#0898C8",
} as const;

/* ------------------------------------------------------------------ */
/* RGB tuples for jsPDF (0-255)                                        */
/* ------------------------------------------------------------------ */

export const PDF_COLORS = {
  primary: [0, 182, 226] as const,       // Champ Blue #00B6E2
  champion: [6, 130, 187] as const,      // Dusty Denim #0682BB
  text: [4, 90, 130] as const,             // #045A82
  textSecondary: [5, 109, 165] as const,  // #056DA5
  textMuted: [6, 120, 177] as const,      // Dusty Denim #0678B1
  border: [184, 228, 240] as const,       // #B8E4F0
  bgLight: [240, 249, 252] as const,      // #F0F9FC
  warningBg: [224, 240, 248] as const,    // #E0F0F8
  warningText: [5, 90, 140] as const,     // #055A8C
  white: [255, 255, 255] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Type exports                                                        */
/* ------------------------------------------------------------------ */

export type BrandColor = keyof typeof BRAND_COLORS;
export type PdfColor = keyof typeof PDF_COLORS;
