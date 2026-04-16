/**
 * WCAG AA Contrast Regression Guard — No low-contrast text on Champ Blue
 *
 * White text (#FFFFFF) on Champ Blue (#00B6E2 / bg-brand-primary)
 * measures ~2.39:1 contrast, failing WCAG AA (4.5:1 normal, 3:1 large).
 *
 * Dusty Denim text (#0682BB / text-brand-primary-dark) on Champ Blue
 * bg (#00B6E2 / bg-brand-primary) measures ~1.79:1 — even worse.
 *
 * This test scans consumer-facing source files for BOTH dangerous
 * combinations on `bg-brand-primary`:
 *   1. `text-white` on `bg-brand-primary` (~2.39:1, FAIL)
 *   2. `text-brand-primary-dark` on `bg-brand-primary` (~1.79:1, FAIL)
 *
 * Correct pairings use `bg-brand-premium` (#055A8C) with `text-white`
 * for dark backgrounds (~7.38:1, AA PASS).
 *
 * Contrast ratios (WCAG relative luminance formula):
 *   - White (#FFF) on Champ Blue (#00B6E2): ~2.39:1 (FAIL)
 *   - White (#FFF) on Dusty Denim (#0682BB): ~4.27:1 (FAIL normal)
 *   - White (#FFF) on Premium (#055A8C): ~7.38:1 (AA PASS)
 *   - Dusty Denim (#0682BB) on Champ Blue (#00B6E2): ~1.79:1 (FAIL)
 *
 * Closes #185.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Scan roots — consumer-facing code.
const ROOTS: readonly string[] = ["app", "components"];

// Excluded paths — PDF/print surfaces may legitimately use white text.
const EXCLUDED_PREFIXES: readonly string[] = [
  "app/api/report/pdf",
];

// File extensions to scan.
const SCAN_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, acc);
    } else if (SCAN_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function isExcluded(relPath: string): boolean {
  const posix = toPosix(relPath);
  return EXCLUDED_PREFIXES.some((prefix) => posix.startsWith(prefix));
}

/**
 * Detects dangerous low-contrast patterns on `bg-brand-primary`:
 *
 * 1. `text-white` on `bg-brand-primary` (~2.39:1 — FAIL AA)
 * 2. `text-brand-primary-dark` on `bg-brand-primary` (~1.79:1 — FAIL AA)
 *
 * Both same-line and section-level (parent container bg with child text)
 * patterns are detected.
 */
function findViolations(
  filePath: string,
): Array<{ line: number; text: string }> {
  const contents = readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);
  const hits: Array<{ line: number; text: string }> = [];

  // bg-brand-primary must NOT be followed by -dark or -light.
  const bgPattern = /(?:^|[^-])bg-brand-primary(?!-dark|-light)/;
  const hoverBgPattern = /hover:bg-brand-primary(?!-dark|-light)/;
  const textWhitePattern = /text-white/;
  // Dusty Denim text on Champ Blue bg is even worse (1.79:1)
  const textPrimaryDarkPattern = /text-brand-primary-dark/;

  // Also catch Champ Blue gradient containers (from-brand-primary)
  const gradientPattern = /from-brand-primary(?!-dark|-light)/;

  // Any "bad text" on a Champ Blue background
  function hasBadText(line: string): boolean {
    return textWhitePattern.test(line) || textPrimaryDarkPattern.test(line);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDangerousBg =
      bgPattern.test(line) ||
      hoverBgPattern.test(line);
    if (hasDangerousBg && hasBadText(line)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  }

  // Section-level — a container element (section/div) has
  // bg-brand-primary or a Champ Blue gradient on one line and
  // bad text appears in child elements within the same JSX block.
  let inBrandPrimarySection = false;
  let sectionDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section/div opening with bg-brand-primary or gradient
    const hasSectionBg =
      bgPattern.test(line) || gradientPattern.test(line);
    if (
      !inBrandPrimarySection &&
      hasSectionBg &&
      /<(?:section|div)\b/.test(line)
    ) {
      inBrandPrimarySection = true;
      sectionDepth = 1;
      continue;
    }

    if (inBrandPrimarySection) {
      // Count open/close tags (rough heuristic)
      const opens = (line.match(/<(?:section|div)\b/g) || []).length;
      const closes = (line.match(/<\/(?:section|div)>/g) || []).length;
      sectionDepth += opens - closes;

      if (sectionDepth <= 0) {
        inBrandPrimarySection = false;
        continue;
      }

      // Check for bad text inside the section (skip lines already caught)
      if (hasBadText(line) && !bgPattern.test(line)) {
        hits.push({ line: i + 1, text: line.trim() });
      }
    }
  }

  return hits;
}

describe("No low-contrast text on bg-brand-primary (WCAG AA, ticket #185)", () => {
  const projectRoot = process.cwd();
  const files: string[] = [];
  for (const root of ROOTS) {
    const abs = join(projectRoot, root);
    try {
      walk(abs, files);
    } catch {
      // Root missing — treat as empty
    }
  }

  it("collects a non-empty set of files to scan (sanity check)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("finds no low-contrast text on bg-brand-primary surfaces", () => {
    const allHits: Array<{ file: string; line: number; text: string }> = [];

    for (const file of files) {
      const rel = toPosix(relative(projectRoot, file));
      if (isExcluded(rel)) continue;
      const violations = findViolations(file);
      for (const v of violations) {
        allHits.push({ file: rel, line: v.line, text: v.text });
      }
    }

    const message =
      allHits.length === 0
        ? ""
        : `WCAG AA violation: low-contrast text on bg-brand-primary.\n` +
          `text-white on Champ Blue = ~2.39:1; text-brand-primary-dark on Champ Blue = ~1.79:1.\n` +
          `Fix: use bg-brand-premium (#055A8C) with text-white (~7.38:1, AA PASS).\n\n` +
          allHits
            .map((h) => `  ${h.file}:${h.line}  ${h.text}`)
            .join("\n");
    expect(allHits, message).toEqual([]);
  });
});
