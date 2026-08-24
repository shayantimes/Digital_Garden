import { NextResponse } from "next/server";
import { isSameOrigin, sessionCookieName, sessionCookieOptions } from "../../../lib/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
