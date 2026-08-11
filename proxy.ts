import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySessionToken } from "./app/lib/session";

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/admin/login") return NextResponse.next();
  const session = await verifySessionToken(request.cookies.get(sessionCookieName())?.value);
  if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
