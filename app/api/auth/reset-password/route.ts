import { NextResponse } from "next/server";
import { resetPasswordSchema } from "../../../lib/auth-validation";
import { rateLimit } from "../../../lib/rate-limit";
import { isSameOrigin, sessionCookieName, sessionCookieOptions } from "../../../lib/session";
import { updateOwnerPassword } from "../../../lib/supabase-auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const limit = rateLimit(request, "password-reset-complete", 5, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Request a new reset email later." }, { status: 429 });
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues.find((issue) => issue.path[0] === "password")?.message || "The reset link is invalid.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  try {
    const updated = await updateOwnerPassword(parsed.data.accessToken, parsed.data.password);
    if (!updated) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(0), maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[auth:reset-password]", error);
    return NextResponse.json({ error: "The password could not be changed." }, { status: 500 });
  }
}
