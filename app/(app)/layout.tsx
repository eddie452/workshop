import { NavBar } from "@/components/layout";

/**
 * Layout for authenticated app pages.
 *
 * Wraps all routes under `(app)/` with the unified navigation bar in
 * its authenticated variant. Individual pages handle their own auth
 * checks and redirects.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-surface-muted">
      <NavBar authState="authenticated" />
      {children}
    </div>
  );
}
