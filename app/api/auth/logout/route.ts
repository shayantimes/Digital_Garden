import { NextResponse } from "next/server";
import { isSameOrigin, publicSiteUrl, sessionCookieName } from "../../../lib/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.redirect(new URL("/admin/login", publicSiteUrl(request)), 303);
  response.cookies.set(sessionCookieName(), "", { path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
