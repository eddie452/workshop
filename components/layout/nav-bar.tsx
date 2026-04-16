"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Unified navigation bar that adapts to auth state (ticket #106).
 *
 * Replaces the two prior nav implementations:
 *   - Inline landing nav in `app/page.tsx`
 *   - `components/layout/nav-header.tsx` (authenticated)
 *
 * Both variants share the same logo, brand colors, and mobile hamburger
 * pattern. Passing `authState` at the call site avoids leaking client
 * auth checks into the component and lets the parent server component
 * decide which variant to render.
 */

export type NavBarAuthState = "authenticated" | "unauthenticated";

interface NavLink {
  href: string;
  label: string;
}

const AUTHENTICATED_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkin", label: "Check-in" },
  { href: "/children", label: "Children" },
  { href: "/scout", label: "Scout" },
];

export interface NavBarProps {
  authState: NavBarAuthState;
}

export function NavBar({ authState }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = authState === "authenticated";
  const logoHref = isAuthenticated ? "/dashboard" : "/";

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="border-b border-white/20 bg-brand-premium"
      data-testid="nav-bar"
      data-auth-state={authState}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        {/* Logo */}
        <Link href={logoHref} className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/champ-logo-alt.png"
            alt="Champ Allergy"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 sm:flex">
          {isAuthenticated ? (
            <>
              {AUTHENTICATED_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-button px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                data-testid="sign-out-button"
                className="ml-2 rounded-button px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-button px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-button bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:bg-brand-accent-dark"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-button p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="border-t border-white/20 bg-brand-premium px-4 pb-3 pt-2 sm:hidden"
          data-testid="nav-bar-mobile-menu"
        >
          {isAuthenticated ? (
            <>
              {AUTHENTICATED_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-button px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                data-testid="sign-out-button-mobile"
                className="mt-1 block w-full rounded-button border-t border-white/20 px-3 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-button px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 block rounded-button bg-brand-accent px-3 py-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:bg-brand-accent-dark"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
