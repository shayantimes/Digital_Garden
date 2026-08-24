import { NextResponse } from "next/server";
import { loginSchema } from "../../../lib/auth-validation";
import { rateLimit } from "../../../lib/rate-limit";
import { isSameOrigin, sessionCookieName, sessionCookieOptions } from "../../../lib/session";
import { signInOwner } from "../../../lib/supabase-auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limit = rateLimit(request, "admin-login", 8, 15 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your username or email and password." }, { status: 400 });
  try {
    const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const result = await signInOwner(parsed.data.identity, parsed.data.password, forwardedIp);
    if (!result) return NextResponse.json({ error: "The username/email or password is incorrect." }, { status: 401 });
    const response = NextResponse.json({ ok: true, username: result.username });
    response.cookies.set(sessionCookieName(), result.accessToken, sessionCookieOptions(result.expiresIn));
    return response;
  } catch (error) {
    console.error("[auth:login]", error);
    return NextResponse.json({ error: "Login is not configured yet." }, { status: 503 });
  }
}
