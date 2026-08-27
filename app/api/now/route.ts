import { NextResponse } from "next/server";
import { formatValidationError, gardenNowArraySchema } from "../../lib/content-schema";
import { rateLimit } from "../../lib/rate-limit";
import { isAdminRequest, isSameOrigin } from "../../lib/session";
import { contentBackend, readGardenNow, writeGardenNow } from "../../lib/server-content";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request) {
  const isAdmin = await isAdminRequest(request);
  try {
    const result = await readGardenNow({ live: isAdmin });
    return NextResponse.json({ items: result.items, source: result.source, backend: contentBackend() }, {
      headers: {
        "Cache-Control": isAdmin ? "no-store, private" : "public, s-maxage=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[now:read]", error);
    return errorResponse("The Now section could not be loaded.", 500);
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  if (!await isAdminRequest(request)) return errorResponse("Authentication required.", 401);
  const limit = rateLimit(request, "now-write", 60, 60_000);
  if (!limit.allowed) return errorResponse("Too many changes. Wait a moment and try again.", 429, { "Retry-After": String(limit.retryAfter) });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 25_000) return errorResponse("The Now section is too large.", 413);
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  const parsed = gardenNowArraySchema.safeParse(body?.items);
  if (!parsed.success) return errorResponse(formatValidationError(parsed.error), 400);
  try {
    const source = await writeGardenNow(parsed.data);
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    console.error("[now:write]", error);
    return errorResponse(error instanceof Error ? error.message : "The Now section could not be saved.", 500);
  }
}
