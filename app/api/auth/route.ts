import { NextResponse } from "next/server";
import { currentSession, developmentAuthBypass } from "../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    login: session?.login || null,
    developmentBypass: developmentAuthBypass(),
  }, { headers: { "Cache-Control": "no-store, private" } });
}
