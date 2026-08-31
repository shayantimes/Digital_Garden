import { NextResponse } from "next/server";
import { rateLimit } from "../../lib/rate-limit";
import { isAdminRequest } from "../../lib/session";
import { readGardenBackupFiles } from "../../lib/server-content";
import { createZip } from "../../lib/zip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = rateLimit(request, "backup-download", 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many backup requests. Wait a minute and try again." }, { status: 429 });
  try {
    const archive = createZip(await readGardenBackupFiles());
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(archive), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Disposition": `attachment; filename="shayan-garden-${date}.zip"`,
        "Content-Type": "application/zip",
      },
    });
  } catch (error) {
    console.error("[backup]", error);
    return NextResponse.json({ error: "The garden backup could not be created." }, { status: 500 });
  }
}
