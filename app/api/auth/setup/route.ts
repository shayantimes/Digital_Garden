import { NextResponse } from "next/server";
import { setupOwnerSchema } from "../../../lib/auth-validation";
import { rateLimit } from "../../../lib/rate-limit";
import { isSameOrigin, publicSiteUrl } from "../../../lib/session";
import { authConfigurationStatus, createOwnerAccount, ownerSetupEnabled } from "../../../lib/supabase-auth";

export async function GET() {
  return NextResponse.json(
    { ...authConfigurationStatus(), enabled: ownerSetupEnabled() },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!ownerSetupEnabled()) return NextResponse.json({ error: "Owner setup is locked." }, { status: 404 });
  const configuration = authConfigurationStatus();
  if (!configuration.configured) return NextResponse.json({ error: "Account creation is not connected yet. Add the Supabase URL and publishable key to .env.local, then restart the site." }, { status: 503 });
  const limit = rateLimit(request, "owner-account-setup", 3, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many setup attempts. Try again later." }, { status: 429 });
  const parsed = setupOwnerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the account details." }, { status: 400 });
  try {
    const redirect = new URL("/admin/login?confirmed=1", publicSiteUrl(request));
    const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const result = await createOwnerAccount(parsed.data.username, parsed.data.email, parsed.data.password, redirect.toString(), forwardedIp);
    if (!result) return NextResponse.json({ error: "Those details do not match the configured garden owner." }, { status: 403 });
    return NextResponse.json({ ok: true, confirmationRequired: result.confirmationRequired });
  } catch (error) {
    console.error("[auth:setup]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The owner account could not be created." }, { status: 400 });
  }
}
