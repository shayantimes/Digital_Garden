import { NextResponse } from "next/server";
import { currentSession } from "../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentSession().catch(() => null);
  return NextResponse.json({
    authenticated: Boolean(session),
    username: session?.username || null,
  }, { headers: { "Cache-Control": "no-store, private" } });
}
