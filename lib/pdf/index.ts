/**
 * PDF Module
 *
 * Server-side PDF generation for the Allergy Madness report.
 * Never import from client components.
 */

export { generateReportPdf } from "./report";
export type { PdfReportInput, PdfAllergenEntry } from "./types";
