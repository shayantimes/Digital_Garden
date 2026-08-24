import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName } from "./app/lib/session";
import { ownerSetupEnabled, verifyOwnerAccessToken } from "./app/lib/supabase-auth";

const publicAdminPaths = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicAdminPaths.has(path)) return NextResponse.next();
  if (path === "/admin/setup" && ownerSetupEnabled()) return NextResponse.next();
  const session = await verifyOwnerAccessToken(request.cookies.get(sessionCookieName())?.value).catch(() => null);
  if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
