import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Protected route list. Unauthenticated users hitting these paths
 * are redirected to /login.
 */
const PROTECTED_PATHS = [
  "/dashboard",
  "/checkin",
  "/onboarding",
  "/travel",
  "/children",
  "/scout",
  "/settings",
];

/**
 * Auth paths. Authenticated users hitting these paths
 * are redirected to /dashboard.
 */
const AUTH_PATHS = ["/login", "/signup"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Unauthenticated user trying to access protected route → redirect to login
  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user trying to access auth pages → redirect to dashboard
  if (user && isAuthPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public API routes that don't need auth
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/error|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
