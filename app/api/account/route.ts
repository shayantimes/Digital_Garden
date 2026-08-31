import { NextResponse } from "next/server";
import { accountUpdateSchema } from "../../lib/auth-validation";
import { rateLimit } from "../../lib/rate-limit";
import { currentAccessToken, currentSession, isSameOrigin } from "../../lib/session";
import { writeGardenAccount } from "../../lib/server-content";
import { updateOwnerCredentials } from "../../lib/supabase-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ username: session.username, email: session.email }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const session = await currentSession().catch(() => null);
  const accessToken = await currentAccessToken();
  if (!session || !accessToken) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = rateLimit(request, "account-write", 5, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many account changes. Try again later." }, { status: 429 });
  const parsed = accountUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the account details." }, { status: 400 });
  const account = { username: parsed.data.username, email: parsed.data.email.toLowerCase(), userId: "" };
  try {
    const userId = await updateOwnerCredentials(accessToken, account, parsed.data.newPassword);
    await writeGardenAccount({ ...account, userId });
    return NextResponse.json({ ok: true, ...account, emailConfirmationMayBeRequired: account.email !== session.email });
  } catch (error) {
    console.error("[account:update]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The account could not be updated." }, { status: 500 });
  }
}
