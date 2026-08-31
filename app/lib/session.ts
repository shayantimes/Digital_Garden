import "server-only";

import { cookies } from "next/headers";
import { verifyOwnerAccessToken } from "./supabase-auth";

export function sessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-garden_session" : "garden_session";
}

export function sessionCookieOptions(maxAge = 3_600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}

export async function currentSession() {
  return verifyOwnerAccessToken(await currentAccessToken());
}

export async function currentAccessToken() {
  const store = await cookies();
  return store.get(sessionCookieName())?.value || null;
}

export async function isAdminRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const name = sessionCookieName().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return Boolean(await verifyOwnerAccessToken(match?.[1]).catch(() => null));
}

export function publicSiteUrl(request: Request) {
  const configured = process.env.GARDEN_SITE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("GARDEN_SITE_URL must use HTTPS in production.");
    }
    return url;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GARDEN_SITE_URL is required in production.");
  return new URL(new URL(request.url).origin);
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestUrl = new URL(request.url);
    const requestHost = forwardedHost || request.headers.get("host") || requestUrl.host;
    const requestProtocol = forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;
    return originUrl.host === requestHost && originUrl.protocol === requestProtocol;
  } catch {
    return false;
  }
}
