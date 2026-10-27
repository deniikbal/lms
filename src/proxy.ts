import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic route guard (Next 16 renamed `middleware` to `proxy`).
 *
 * This only checks that a session cookie *exists* — it never touches the
 * database, because proxy runs on every request including prefetches. The real
 * authorisation happens next to the data, via `requireRole()` in the DAL.
 */
const PROTECTED_PREFIXES = ["/admin", "/guru", "/siswa", "/dashboard"];

function isUnder(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (!hasSessionCookie && isUnder(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Deliberately no "cookie present -> bounce off /login" rule here. A cookie can
  // outlive its session (expired, revoked, or the database was reset), and this
  // check cannot tell the difference. Redirecting on cookie presence alone put
  // /login and /dashboard in an endless 307/200 loop for anyone holding a stale
  // cookie. The auth pages verify the session themselves instead — see the
  // `RedirectIfSignedIn` guard in app/login/page.tsx.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
