import { NextResponse } from "next/server";
import { rateLimit } from "../../lib/rate-limit";
import { isAdminRequest, isSameOrigin } from "../../lib/session";
import { writeGardenMedia } from "../../lib/server-content";

const EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function hasValidSignature(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (type === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (type === "image/avif") return bytes.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(bytes.subarray(8, 12).toString("ascii"));
  return false;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await isAdminRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = rateLimit(request, "media-upload", 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many uploads. Wait a minute and try again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8.5 * 1024 * 1024) return NextResponse.json({ error: "This upload is too large." }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  const extension = EXTENSIONS[file.type];
  if (!extension) return NextResponse.json({ error: "Use a JPG, PNG, WebP, GIF, or AVIF image." }, { status: 415 });
  if (file.size < 12 || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Images must be between 12 bytes and 8 MB." }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "The file contents do not match its image type." }, { status: 415 });

  const base = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "garden-image";
  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}.${extension}`;

  try {
    const url = await writeGardenMedia(fileName, bytes);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[media:upload]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The image could not be uploaded." }, { status: 500 });
  }
}
