import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Route guard for protected sections of the app. The `auth` wrapper from
// NextAuth v5 extends the request with `req.auth` (the resolved session, or
// null). We redirect unauthenticated visitors away from `/dashboard` to the
// landing page.
//
// Note (Next.js 16): this file uses the `proxy` convention (the old
// `middleware` file convention is deprecated). Proxy defaults to the Node.js
// runtime (no `runtime` config is permitted here). The Node.js runtime is
// required for the database session strategy used by `auth()` to read the
// session.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !req.auth) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Scope the guard to /dashboard routes. This pattern inherently excludes the
  // Auth.js endpoints (/api/auth/*), Next.js internal static assets
  // (/_next/static, /_next/image), and /favicon.ico since none of those live
  // under /dashboard. The negative-lookahead segment keeps the guard from
  // matching any future non-dashboard internal assets as well.
  matcher: ["/dashboard/:path*"],
};
