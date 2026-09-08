import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "family_session";
const DEFAULT_HOME = "/expenses";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL(DEFAULT_HOME, request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Only preserve a useful return path (skip bare "/").
    if (pathname && pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(DEFAULT_HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/overview/:path*", "/expenses/:path*", "/income/:path*", "/investments/:path*", "/calendar/:path*", "/goals/:path*", "/health/:path*", "/parenting/:path*", "/travel/:path*", "/admin/:path*", "/login"],
};
