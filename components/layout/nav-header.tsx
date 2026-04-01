"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation header for authenticated pages.
 *
 * Provides app logo, navigation links, and a mobile hamburger menu.
 * Highlighted link indicates the active route.
 */

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkin", label: "Check-in" },
  { href: "/children", label: "Children" },
  { href: "/scout", label: "Scout" },
];

export function NavHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      className="border-b border-brand-border bg-white"
      data-testid="nav-header"
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-lg font-bold text-brand-primary-dark"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Champ
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-button px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-brand-primary-light text-brand-primary"
                  : "text-brand-text-secondary hover:bg-brand-surface-muted hover:text-brand-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-button p-2 text-brand-text-secondary transition-colors hover:bg-brand-surface-muted hover:text-brand-text sm:hidden"
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
        <div className="border-t border-brand-border px-4 pb-3 pt-2 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-button px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-brand-primary-light text-brand-primary"
                  : "text-brand-text-secondary hover:bg-brand-surface-muted hover:text-brand-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
