import { NextResponse } from "next/server";
import { formatValidationError, gardenPostSchema } from "../../lib/content-schema";
import { rateLimit } from "../../lib/rate-limit";
import { isAdminRequest, isSameOrigin } from "../../lib/session";
import { contentBackend, deleteGardenPost, readGardenPosts, writeGardenPost } from "../../lib/server-content";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

async function authorizeMutation(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  if (!await isAdminRequest(request)) return errorResponse("Authentication required.", 401);
  const limit = rateLimit(request, "content-write", 60, 60_000);
  if (!limit.allowed) return errorResponse("Too many changes. Wait a moment and try again.", 429, { "Retry-After": String(limit.retryAfter) });
  return null;
}

export async function GET(request: Request) {
  const isAdmin = await isAdminRequest(request);
  try {
    const result = await readGardenPosts({ live: isAdmin });
    const posts = isAdmin ? result.posts : result.posts.filter((post) => post.status === "Published");
    return NextResponse.json({ posts, source: result.source, backend: contentBackend() }, {
      headers: {
        "Cache-Control": isAdmin ? "no-store, private" : "public, s-maxage=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[content:read]", error);
    return errorResponse("Garden content could not be loaded.", 500);
  }
}

export async function PUT(request: Request) {
  const denied = await authorizeMutation(request);
  if (denied) return denied;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 750_000) return errorResponse("This note is too large.", 413);
  const body = (await request.json().catch(() => null)) as { post?: unknown } | null;
  const parsed = gardenPostSchema.safeParse(body?.post);
  if (!parsed.success) return errorResponse(formatValidationError(parsed.error), 400);
  try {
    const source = await writeGardenPost(parsed.data);
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    console.error("[content:write]", error);
    return errorResponse(error instanceof Error ? error.message : "This note could not be saved.", 500);
  }
}

export async function DELETE(request: Request) {
  const denied = await authorizeMutation(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const parsed = gardenPostSchema.shape.id.safeParse(body?.id);
  if (!parsed.success) return errorResponse("A valid note ID is required.", 400);
  try {
    const source = await deleteGardenPost(parsed.data);
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    console.error("[content:delete]", error);
    return errorResponse(error instanceof Error ? error.message : "This note could not be removed.", 500);
  }
}
