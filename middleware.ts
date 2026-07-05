import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "family_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") return NextResponse.next();

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/overview/:path*", "/expenses/:path*", "/income/:path*", "/investments/:path*", "/calendar/:path*", "/goals/:path*", "/health/:path*", "/parenting/:path*", "/admin/:path*", "/login"],
};
