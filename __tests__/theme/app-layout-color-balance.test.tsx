import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import AppLayout from "@/app/(app)/layout";

/**
 * 50-30-18-2 color balance audit (#153).
 *
 * Authenticated app pages (dashboard, leaderboard, checkin, etc.) render
 * inside `app/(app)/layout.tsx`. Previously the wrapper had no surface
 * color, so the default white body dominated the viewport and Champ Blue
 * weight was starved on every authenticated surface.
 *
 * The wrapper now sets `bg-brand-surface-muted` (#F0F9FC — a pale Champ
 * Blue tint) so the field behind cards contributes to the ~50% Champ Blue
 * weight without changing copy, layout, or card legibility.
 */

// NavBar is a client component that uses the browser Supabase client +
// next/navigation hooks. Mock them so the server layout renders cleanly.
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
  }),
}));

describe("AppLayout color balance", () => {
  it("tints the authenticated viewport with Champ Blue surface", () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="app-child">child</div>
      </AppLayout>,
    );

    const wrapper = container.firstElementChild as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    const classes = wrapper!.className.split(/\s+/);
    expect(classes).toContain("bg-brand-surface-muted");
    expect(classes).toContain("min-h-screen");
  });
});
