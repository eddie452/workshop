/**
 * PDF Report Builder
 *
 * Generates a branded Allergy Madness PDF report using jsPDF.
 * Server-side only — never import from client components.
 *
 * The report includes:
 * - Champ Health / Allergy Madness branding
 * - Child name, date, and region
 * - Trigger Champion highlight
 * - Final Four section
 * - Full ranked allergen table with confidence tiers
 * - FDA disclaimer on every page (regulatory requirement)
 */

import { jsPDF } from "jspdf";
import {
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "@/components/shared/fda-disclaimer";
import { PDF_COLORS } from "@/lib/theme";
import type { PdfReportInput, PdfAllergenEntry } from "./types";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_Y = PAGE_HEIGHT - 25;

const COLOR_PRIMARY = PDF_COLORS.primary;
const COLOR_CHAMPION = PDF_COLORS.champion;
const COLOR_TEXT = PDF_COLORS.textSecondary;
const COLOR_MUTED = PDF_COLORS.textMuted;
const COLOR_BORDER = PDF_COLORS.border;
const COLOR_BG_LIGHT = PDF_COLORS.bgLight;
const COLOR_WARNING_BG = PDF_COLORS.warningBg;
const COLOR_WARNING_TEXT = PDF_COLORS.warningText;

const TIER_LABELS: Record<string, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/* ------------------------------------------------------------------ */
/* Helper: sanitize text for jsPDF                                     */
/* ------------------------------------------------------------------ */

/**
 * Replace characters unsupported by jsPDF's default Helvetica font.
 * Em dashes (\u2014) are silently dropped; replace with ASCII hyphen.
 */
function sanitizeForPdf(text: string): string {
  return text.replace(/\u2014/g, "-");
}

/* ------------------------------------------------------------------ */
/* Helper: format date                                                 */
/* ------------------------------------------------------------------ */

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Helper: category display                                            */
/* ------------------------------------------------------------------ */

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    tree: "Tree Pollen",
    grass: "Grass Pollen",
    weed: "Weed Pollen",
    mold: "Mold",
    indoor: "Indoor",
    food: "Food",
  };
  return labels[category] ?? category;
}

/* ------------------------------------------------------------------ */
/* Helper: add FDA footer to current page                              */
/* ------------------------------------------------------------------ */

function addFdaFooter(doc: jsPDF): void {
  // Separator line
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, FOOTER_Y, PAGE_WIDTH - MARGIN_RIGHT, FOOTER_Y);

  // FDA disclaimer label
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_WARNING_TEXT);
  doc.text(sanitizeForPdf(FDA_DISCLAIMER_LABEL), MARGIN_LEFT, FOOTER_Y + 5);

  // FDA full text (wrapped)
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_MUTED);
  const lines = doc.splitTextToSize(sanitizeForPdf(FDA_DISCLAIMER_FULL_TEXT), CONTENT_WIDTH);
  doc.text(lines, MARGIN_LEFT, FOOTER_Y + 9);
}

/* ------------------------------------------------------------------ */
/* Helper: check page break                                            */
/* ------------------------------------------------------------------ */

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y - 5) {
    addFdaFooter(doc);
    doc.addPage();
    addFdaFooter(doc);
    return 25; // top margin on new page
  }
  return y;
}

/* ------------------------------------------------------------------ */
/* Main: generate PDF                                                  */
/* ------------------------------------------------------------------ */

/**
 * Generate the allergen report PDF.
 *
 * @param input - Report data (child name, date, region, allergens)
 * @returns PDF as a Uint8Array buffer
 */
export function generateReportPdf(input: PdfReportInput): Uint8Array {
  const { childName, generatedAt, region, allergens } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = 20;

  // ---- Header / Branding ----
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Allergy Madness", MARGIN_LEFT, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_MUTED);
  doc.text("by Champ Health", MARGIN_LEFT, y);

  y += 4;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);

  // ---- Report Title ----
  y += 10;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT);
  doc.text("Allergen Prediction Report", MARGIN_LEFT, y);

  // ---- Meta Info ----
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`Name: ${childName}`, MARGIN_LEFT, y);

  y += 5;
  doc.text(`Date: ${formatDate(generatedAt)}`, MARGIN_LEFT, y);

  if (region) {
    y += 5;
    doc.text(`Region: ${region}`, MARGIN_LEFT, y);
  }

  // ---- FDA Disclaimer Banner (inline, prominent) ----
  y += 10;
  doc.setFillColor(...COLOR_WARNING_BG);
  doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_WARNING_TEXT);
  doc.text(sanitizeForPdf(FDA_DISCLAIMER_LABEL), MARGIN_LEFT + 4, y + 1);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const disclaimerLines = doc.splitTextToSize(
    sanitizeForPdf(FDA_DISCLAIMER_FULL_TEXT),
    CONTENT_WIDTH - 8
  );
  doc.text(disclaimerLines[0] ?? "", MARGIN_LEFT + 4, y + 6);

  y += 18;

  // ---- Trigger Champion ----
  if (allergens.length > 0) {
    const champion = allergens[0];

    y = checkPageBreak(doc, y, 30);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_CHAMPION);
    doc.text("Trigger Champion", MARGIN_LEFT, y);

    y += 7;
    doc.setFillColor(224, 245, 251);
    doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 16, 2, 2, "F");
    doc.setDrawColor(...COLOR_CHAMPION);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 16, 2, 2, "S");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_TEXT);
    doc.text(`#1  ${champion.common_name}`, MARGIN_LEFT + 4, y + 2);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `${categoryLabel(champion.category)}  |  Confidence: ${TIER_LABELS[champion.confidence_tier] ?? champion.confidence_tier}`,
      MARGIN_LEFT + 4,
      y + 8
    );

    y += 20;
  }

  // ---- Final Four ----
  const finalFour = allergens.slice(0, 4);
  if (finalFour.length > 1) {
    y = checkPageBreak(doc, y, 10 + finalFour.length * 8);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text("Final Four", MARGIN_LEFT, y);

    y += 6;

    for (const entry of finalFour) {
      y = checkPageBreak(doc, y, 8);
      drawAllergenRow(doc, entry, y);
      y += 8;
    }

    y += 4;
  }

  // ---- Full Rankings Table ----
  if (allergens.length > 4) {
    y = checkPageBreak(doc, y, 20);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_TEXT);
    doc.text("Full Rankings", MARGIN_LEFT, y);

    y += 4;

    // Table header
    y = checkPageBreak(doc, y, 8);
    drawTableHeader(doc, y);
    y += 7;

    // Table rows
    for (const entry of allergens.slice(4)) {
      y = checkPageBreak(doc, y, 7);
      drawTableRow(doc, entry, y);
      y += 7;
    }
  }

  // ---- Footer on last page ----
  addFdaFooter(doc);

  // Return as buffer
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                     */
/* ------------------------------------------------------------------ */

function drawAllergenRow(doc: jsPDF, entry: PdfAllergenEntry, y: number): void {
  // Alternating background
  if (entry.rank % 2 === 0) {
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.rect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 7, "F");
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`#${entry.rank}`, MARGIN_LEFT + 2, y);

  doc.setFont("helvetica", "normal");
  doc.text(entry.common_name, MARGIN_LEFT + 14, y);

  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(categoryLabel(entry.category), MARGIN_LEFT + 80, y);
  doc.text(
    TIER_LABELS[entry.confidence_tier] ?? entry.confidence_tier,
    MARGIN_LEFT + 120,
    y
  );
}

function drawTableHeader(doc: jsPDF, y: number): void {
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(MARGIN_LEFT, y - 3, CONTENT_WIDTH, 6, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Rank", MARGIN_LEFT + 2, y + 1);
  doc.text("Allergen", MARGIN_LEFT + 14, y + 1);
  doc.text("Category", MARGIN_LEFT + 80, y + 1);
  doc.text("Confidence", MARGIN_LEFT + 120, y + 1);
}

function drawTableRow(doc: jsPDF, entry: PdfAllergenEntry, y: number): void {
  if (entry.rank % 2 === 0) {
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.rect(MARGIN_LEFT, y - 3.5, CONTENT_WIDTH, 6.5, "F");
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`${entry.rank}`, MARGIN_LEFT + 2, y + 1);
  doc.text(entry.common_name, MARGIN_LEFT + 14, y + 1);

  doc.setTextColor(...COLOR_MUTED);
  doc.setFontSize(8);
  doc.text(categoryLabel(entry.category), MARGIN_LEFT + 80, y + 1);
  doc.text(
    TIER_LABELS[entry.confidence_tier] ?? entry.confidence_tier,
    MARGIN_LEFT + 120,
    y + 1
  );
}
