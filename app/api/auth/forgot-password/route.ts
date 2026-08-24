import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "../../../lib/auth-validation";
import { rateLimit } from "../../../lib/rate-limit";
import { isSameOrigin, publicSiteUrl } from "../../../lib/session";
import { authConfigurationStatus, ownerIdentityMatches, sendOwnerPasswordReset } from "../../../lib/supabase-auth";

const genericMessage = "If that account matches the garden owner, a reset email has been sent.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!authConfigurationStatus().configured) return NextResponse.json({ error: "Password recovery is not connected yet. Complete the owner-account setup first." }, { status: 503 });
  const limit = rateLimit(request, "password-reset-request", 3, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ message: genericMessage });
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: genericMessage });
  try {
    if (ownerIdentityMatches(parsed.data.identity)) {
      const redirect = new URL("/admin/reset-password", publicSiteUrl(request));
      const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      await sendOwnerPasswordReset(redirect.toString(), forwardedIp);
    }
  } catch (error) {
    console.error("[auth:forgot-password]", error);
  }
  return NextResponse.json({ message: genericMessage });
}
