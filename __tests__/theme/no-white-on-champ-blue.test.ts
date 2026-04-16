/**
 * WCAG AA Contrast Regression Guard — No white text on Champ Blue
 *
 * White text (#FFFFFF) on Champ Blue (#00B6E2 / bg-brand-primary)
 * measures ~2.4:1 contrast, failing WCAG AA (4.5:1 normal, 3:1 large).
 *
 * This test scans consumer-facing source files for the dangerous
 * combination of `text-white` (including opacity variants like
 * `text-white/80`) appearing inside elements or sections that use
 * `bg-brand-primary` as their background — NOT `bg-brand-primary-dark`
 * or `bg-brand-primary-light`, which have acceptable contrast.
 *
 * Contrast ratios (WCAG relative luminance formula):
 *   - White (#FFF) on Champ Blue (#00B6E2): ~2.43:1 (FAIL)
 *   - White (#FFF) on Dusty Denim (#0682BB): ~4.79:1 (AA PASS)
 *   - Dusty Denim (#0682BB) on Champ Blue (#00B6E2): ~1.97:1 —
 *     but brand-primary-dark text on brand-primary bg is used for
 *     large bold headings (3:1 threshold) where the gradient goes
 *     from brand-primary to brand-primary-dark.
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
 * Detects the dangerous pattern: an element or section that has
 * `bg-brand-primary` (but NOT `bg-brand-primary-dark` or
 * `bg-brand-primary-light`) AND `text-white` (with optional opacity
 * suffix like `/80`) in the same className string or within child
 * elements of a bg-brand-primary container.
 *
 * Strategy: scan each file for className strings containing
 * `bg-brand-primary` (exact — not `-dark` or `-light` suffix).
 * Then check if those same className strings also contain `text-white`.
 * Also check for section-level containers where bg-brand-primary
 * is the section bg and text-white appears in child elements.
 */
function findViolations(
  filePath: string,
): Array<{ line: number; text: string }> {
  const contents = readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);
  const hits: Array<{ line: number; text: string }> = [];

  // Pattern 1: Same-line — className contains both bg-brand-primary
  // (or hover:bg-brand-primary) and text-white on the same line.
  // bg-brand-primary must NOT be followed by -dark or -light.
  const bgPattern = /(?:^|[^-])bg-brand-primary(?!-dark|-light)/;
  const hoverBgPattern = /hover:bg-brand-primary(?!-dark|-light)/;
  const textWhitePattern = /text-white/;

  // Also catch Champ Blue gradient containers (from-brand-primary)
  const gradientPattern = /from-brand-primary(?!-dark|-light)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDangerousBg =
      bgPattern.test(line) ||
      hoverBgPattern.test(line);
    if (hasDangerousBg && textWhitePattern.test(line)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  }

  // Pattern 2: Section-level — a container element (section/div) has
  // bg-brand-primary or a Champ Blue gradient on one line and
  // text-white appears in child elements within the same JSX block.
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

      // Check for text-white inside the section (skip lines already caught)
      if (textWhitePattern.test(line) && !bgPattern.test(line)) {
        hits.push({ line: i + 1, text: line.trim() });
      }
    }
  }

  return hits;
}

describe("No text-white on bg-brand-primary (WCAG AA, ticket #185)", () => {
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

  it("finds no text-white on bg-brand-primary surfaces", () => {
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
        : `WCAG AA violation: text-white on bg-brand-primary (~2.4:1 contrast).\n` +
          `Fix by swapping to text-brand-primary-dark (Option A) or bg-brand-primary-dark (Option B).\n\n` +
          allHits
            .map((h) => `  ${h.file}:${h.line}  ${h.text}`)
            .join("\n");
    expect(allHits, message).toEqual([]);
  });
});
