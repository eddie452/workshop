/**
 * No-Black / No-Gray Consumer UI Regression Guard
 *
 * The Champ Health Design System forbids black and near-black on
 * consumer-facing surfaces (see CLAUDE.md and ticket #149). Text
 * hierarchy must use the Dusty Denim `brand-text*` tokens; surfaces
 * must use light-blue tints (`brand-surface-muted`, `brand-border`).
 *
 * This test scans every file under `app/` and `components/` for the
 * forbidden tokens listed below and fails if any are reintroduced.
 *
 * PDF / print code (`app/api/report/pdf/**`) is excluded — print
 * legibility can justify black ink on paper.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Forbidden substrings (case-insensitive). Keep in sync with CLAUDE.md
// "Design system" guidance. Each pattern is a simple substring match
// against the file contents, so tokens like `#000` will also catch
// `#0000` — that's fine, any CSS token beginning with `#000` is a
// violation on consumer surfaces.
const FORBIDDEN_PATTERNS: readonly string[] = [
  // Tailwind utility classes
  "text-black",
  "bg-black",
  "border-black",
  "ring-black",
  "divide-black",
  "text-gray-",
  "bg-gray-",
  "border-gray-",
  "text-slate-",
  "bg-slate-",
  "border-slate-",
  "text-neutral-",
  "bg-neutral-",
  "border-neutral-",
  "text-zinc-",
  "bg-zinc-",
  "border-zinc-",
  // Raw near-black hex literals
  "#000000",
  "#111111",
  "#000 ",
  "#000;",
  "#000\"",
  "#000'",
  "#111 ",
  "#111;",
  "#111\"",
  "#111'",
  // Named color
  '"black"',
  "'black'",
  "fill=\"black\"",
  "stroke=\"black\"",
];

// Scan roots — consumer-facing code.
const ROOTS: readonly string[] = ["app", "components"];

// Excluded paths — PDF/print surfaces may use black for legibility.
// Paths are project-relative and compared with forward slashes.
const EXCLUDED_PREFIXES: readonly string[] = [
  "app/api/report/pdf",
];

// File extensions to scan.
const SCAN_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".mdx",
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      // Skip node_modules and dotfolders just in case
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

describe("No black or gray on consumer-facing UI (ticket #149)", () => {
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
    // If the scan roots disappear or the extension list breaks, this
    // test would silently pass with zero hits. Guard against that.
    expect(files.length).toBeGreaterThan(10);
  });

  for (const pattern of FORBIDDEN_PATTERNS) {
    it(`finds no uses of \`${pattern}\``, () => {
      const hits: Array<{ file: string; line: number; text: string }> = [];
      const needle = pattern.toLowerCase();
      for (const file of files) {
        const rel = toPosix(relative(projectRoot, file));
        if (isExcluded(rel)) continue;
        const contents = readFileSync(file, "utf8");
        if (!contents.toLowerCase().includes(needle)) continue;
        const lines = contents.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(needle)) {
            hits.push({ file: rel, line: i + 1, text: lines[i].trim() });
          }
        }
      }
      // Format hits as a readable error so any regression is easy to fix.
      const message =
        hits.length === 0
          ? ""
          : `Forbidden token "${pattern}" found in consumer UI:\n` +
            hits.map((h) => `  ${h.file}:${h.line}  ${h.text}`).join("\n") +
            "\n\nUse Dusty Denim tokens instead (text-brand-text, " +
            "text-brand-text-secondary, text-brand-text-muted, " +
            "text-brand-text-faint, text-brand-text-accent) and " +
            "light-blue surfaces (bg-brand-surface-muted, border-brand-border).";
      expect(hits, message).toEqual([]);
    });
  }
});
