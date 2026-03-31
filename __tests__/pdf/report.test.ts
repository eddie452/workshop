/**
 * PDF Report Generation Tests
 *
 * Tests the PDF generation utility.
 * Key assertions:
 * - PDF generated with correct allergen rankings
 * - FDA disclaimer present in PDF content
 * - No income_tier in PDF content
 * - PDF is valid (non-empty buffer)
 * - Handles edge cases (empty allergens, missing region)
 */

import { describe, it, expect } from "vitest";
import { generateReportPdf } from "@/lib/pdf/report";
import type { PdfReportInput, PdfAllergenEntry } from "@/lib/pdf/types";
import {
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "@/components/shared/fda-disclaimer";

function makeSampleAllergens(count: number): PdfAllergenEntry[] {
  const names = [
    "Oak",
    "Bermuda Grass",
    "Ragweed",
    "Alternaria",
    "Dust Mites",
    "Cedar",
    "Timothy Grass",
    "Cockroach",
    "Cat Dander",
    "Mold Spores",
  ];
  const categories = [
    "tree",
    "grass",
    "weed",
    "mold",
    "indoor",
    "tree",
    "grass",
    "indoor",
    "indoor",
    "mold",
  ] as PdfAllergenEntry["category"][];
  const tiers = [
    "very_high",
    "high",
    "medium",
    "low",
  ] as PdfAllergenEntry["confidence_tier"][];

  return Array.from({ length: Math.min(count, names.length) }, (_, i) => ({
    rank: i + 1,
    common_name: names[i],
    category: categories[i],
    elo_score: 2000 - i * 100,
    confidence_tier: tiers[i % tiers.length],
  }));
}

function makeSampleInput(
  overrides?: Partial<PdfReportInput>
): PdfReportInput {
  return {
    childName: "Test Child",
    generatedAt: "2026-03-30T12:00:00.000Z",
    region: "Southeast",
    allergens: makeSampleAllergens(8),
    ...overrides,
  };
}

describe("generateReportPdf", () => {
  it("generates a non-empty PDF buffer", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("generates a valid PDF (starts with %PDF header)", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    // PDF files start with %PDF-
    const header = String.fromCharCode(...result.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("includes FDA disclaimer label in PDF content", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    // Convert to string to search for text content
    // jsPDF Helvetica cannot render em dash; report.ts sanitizes to ASCII hyphen
    const pdfText = new TextDecoder("latin1").decode(result);
    const sanitizedLabel = FDA_DISCLAIMER_LABEL.replace(/\u2014/g, "-");
    expect(pdfText).toContain(sanitizedLabel);
  });

  it("includes FDA disclaimer full text in PDF content", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    // Check for a distinctive substring from the full text
    expect(pdfText).toContain("NOT an FDA-approved diagnostic test");
  });

  it("includes child name in PDF content", () => {
    const input = makeSampleInput({ childName: "Emma Johnson" });
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Emma Johnson");
  });

  it("includes allergen names in PDF content", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Oak");
    expect(pdfText).toContain("Ragweed");
    expect(pdfText).toContain("Dust Mites");
  });

  it("includes region in PDF content", () => {
    const input = makeSampleInput({ region: "Southeast" });
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Southeast");
  });

  it("handles null region gracefully", () => {
    const input = makeSampleInput({ region: null });
    const result = generateReportPdf(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    // Should not contain "Region:" label when no region
    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).not.toContain("Region:");
  });

  it("NEVER contains income_tier in PDF content", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).not.toContain("income_tier");
    expect(pdfText).not.toContain("income tier");
    expect(pdfText).not.toContain("incomeTier");
  });

  it("includes Allergy Madness branding", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Allergy Madness");
    expect(pdfText).toContain("Champ Health");
  });

  it("includes Trigger Champion section", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Trigger Champion");
  });

  it("includes Final Four section", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Final Four");
  });

  it("handles single allergen (no Final Four or Full Rankings)", () => {
    const input = makeSampleInput({
      allergens: makeSampleAllergens(1),
    });
    const result = generateReportPdf(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Trigger Champion");
  });

  it("includes confidence tier labels in PDF content", () => {
    const input = makeSampleInput();
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("Very High");
    expect(pdfText).toContain("High");
  });

  it("includes formatted date in PDF content", () => {
    const input = makeSampleInput({
      generatedAt: "2026-03-30T12:00:00.000Z",
    });
    const result = generateReportPdf(input);

    const pdfText = new TextDecoder("latin1").decode(result);
    expect(pdfText).toContain("March");
    expect(pdfText).toContain("2026");
  });

  it("generates larger PDF for many allergens (page break handling)", () => {
    const input = makeSampleInput({
      allergens: makeSampleAllergens(10),
    });
    const result = generateReportPdf(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    const pdfText = new TextDecoder("latin1").decode(result);
    const sanitizedLabel = FDA_DISCLAIMER_LABEL.replace(/\u2014/g, "-");
    expect(pdfText).toContain(sanitizedLabel);
  });
});
