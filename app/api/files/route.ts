import { NextResponse } from "next/server";
import { rateLimit } from "../../lib/rate-limit";
import { isAdminRequest, isSameOrigin } from "../../lib/session";
import { writeGardenFile } from "../../lib/server-content";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = rateLimit(request, "file-upload", 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many uploads. Wait a minute and try again." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  if (file.type !== "application/pdf" || file.size < 5 || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Use a PDF smaller than 10 MB." }, { status: 415 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "This file is not a valid PDF." }, { status: 415 });
  try {
    const url = await writeGardenFile(`shayan-cv-${Date.now()}.pdf`, bytes);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[file:upload]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The CV could not be uploaded." }, { status: 500 });
  }
}
