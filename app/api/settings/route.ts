import { NextResponse } from "next/server";
import { formatValidationError, gardenSettingsSchema } from "../../lib/content-schema";
import { rateLimit } from "../../lib/rate-limit";
import { isAdminRequest, isSameOrigin } from "../../lib/session";
import { contentBackend, readGardenSettings, writeGardenSettings } from "../../lib/server-content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAdmin = await isAdminRequest(request);
  try {
    const result = await readGardenSettings({ live: isAdmin });
    return NextResponse.json({ settings: result.settings, source: result.source, backend: contentBackend() }, {
      headers: { "Cache-Control": isAdmin ? "no-store, private" : "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[settings:read]", error);
    return NextResponse.json({ error: "Garden settings could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = rateLimit(request, "settings-write", 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many changes. Wait a moment and try again." }, { status: 429 });
  const parsed = gardenSettingsSchema.safeParse((await request.json().catch(() => null) as { settings?: unknown } | null)?.settings);
  if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
  try {
    const source = await writeGardenSettings(parsed.data);
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    console.error("[settings:write]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Garden settings could not be saved." }, { status: 500 });
  }
}
