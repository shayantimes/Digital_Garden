import "server-only";

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(request: Request, bucket: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const key = `${bucket}:${address}`;
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [storedKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(storedKey);
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - current.count, retryAfter: 0 };
}
