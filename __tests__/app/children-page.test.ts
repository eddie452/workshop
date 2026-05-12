/**
 * Children Page Integration Test
 *
 * Pins the ungated /children page (post #288): every authenticated
 * user always receives `listChildren` data and the manager renders
 * with `hasAccess` flowing through as a no-op flag.
 *
 * Hybrid approach:
 *   1. Source-scan asserts the page no longer imports
 *      `isFeatureAvailable` and no longer gates the listChildren call.
 *   2. Contract asserts that calling the default export with an
 *      authenticated user always invokes `listChildren`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const CHILDREN_PAGE_PATH = resolve(
  __dirname,
  "../../app/(app)/children/page.tsx",
);

const pageSource = readFileSync(CHILDREN_PAGE_PATH, "utf-8");

/* ------------------------------------------------------------------ */
/* Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/child-profiles", () => ({
  listChildren: vi.fn(),
}));

vi.mock("@/components/children", () => ({
  ChildrenManager: ({
    initialChildren,
    hasAccess,
  }: {
    initialChildren: unknown[];
    hasAccess: boolean;
  }) =>
    `MANAGER:children=${initialChildren.length}:hasAccess=${hasAccess}`,
}));

vi.mock("@/components/layout", () => ({
  PageContainer: ({ children }: { children: unknown }) => children,
}));

import { createClient } from "@/lib/supabase/server";
import { listChildren } from "@/lib/child-profiles";

describe("/children page — source-scan guards (#288)", () => {
  it("no longer imports isFeatureAvailable", () => {
    expect(pageSource).not.toContain("isFeatureAvailable");
  });

  it("no longer references the family_tier gate", () => {
    expect(pageSource).not.toContain("child_profiles");
  });

  it("calls listChildren unconditionally for authenticated users", () => {
    // Should NOT be wrapped in `if (hasAccess)`.
    expect(pageSource).toMatch(/await\s+listChildren\(/);
  });
});

describe("/children page — contract (free-tier user sees manager)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the manager with children data even for a free-tier user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "free-user-1" } } }),
      },
    } as never);
    vi.mocked(listChildren).mockResolvedValue([
      {
        id: "child-1",
        name: "Sam",
        birth_year: 2018,
        created_at: "2024-01-01T00:00:00Z",
        has_pets: false,
        prior_allergy_diagnosis: false,
        known_allergens: null,
      },
    ] as never);

    const mod = await import("@/app/(app)/children/page");
    const out = await mod.default();

    expect(listChildren).toHaveBeenCalledWith(expect.anything(), "free-user-1");
    // Walk the rendered tree to assert the manager received children and hasAccess=true.
    const rendered = JSON.stringify(out);
    expect(rendered).toContain('"hasAccess":true');
    expect(rendered).toContain('"name":"Sam"');
  });
});
