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

/**
 * Paths that require an authenticated user AND a completed onboarding
 * profile. Authenticated-but-onboarding-incomplete users hitting these
 * paths are redirected to /onboarding (issue #282). `/onboarding`
 * itself is intentionally excluded so the wizard can render.
 */
const ONBOARDING_REQUIRED_PATHS = [
  "/dashboard",
  "/checkin",
  "/travel",
  "/children",
  "/scout",
  "/settings",
];

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

function requiresOnboarding(pathname: string): boolean {
  return ONBOARDING_REQUIRED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse, hasOnboardingProfile } =
    await updateSession(request);
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

  // Authenticated user without a completed onboarding profile trying to
  // access an onboarding-gated route → redirect to /onboarding (#282).
  // `hasOnboardingProfile === false` means the lookup succeeded and the
  // user has no `user_profiles.home_region`. A `null` value (lookup
  // error) falls through; downstream server-component guards enforce.
  if (
    user &&
    hasOnboardingProfile === false &&
    requiresOnboarding(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
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
