import { NavHeader } from "@/components/layout";

/**
 * Layout for authenticated app pages.
 *
 * Wraps all routes under `(app)/` with the navigation header.
 * Individual pages handle their own auth checks and redirects.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader />
      {children}
    </>
  );
}
