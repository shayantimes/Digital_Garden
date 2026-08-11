import { NextResponse } from "next/server";
import { formatValidationError, gardenPostArraySchema } from "../../../lib/content-schema";
import { rateLimit } from "../../../lib/rate-limit";
import { isAdminRequest, isSameOrigin } from "../../../lib/session";
import { writeGardenPosts } from "../../../lib/server-content";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = rateLimit(request, "content-import", 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many imports. Wait a minute and try again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 5_000_000) return NextResponse.json({ error: "This import is too large." }, { status: 413 });
  const body = (await request.json().catch(() => null)) as { posts?: unknown } | null;
  const parsed = gardenPostArraySchema.safeParse(body?.posts);
  if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
  try {
    const source = await writeGardenPosts(parsed.data);
    return NextResponse.json({ ok: true, imported: parsed.data.length, source });
  } catch (error) {
    console.error("[content:import]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "These notes could not be imported." }, { status: 500 });
  }
}
