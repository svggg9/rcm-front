import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = [
  "/profile",
  "/checkout",
  "/seller",
  "/admin",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;

  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !token) {
    const loginUrl = new URL("/auth/login", request.url);

    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/checkout/:path*",
    "/seller/:path*",
    "/admin/:path*",
  ],
};