import "server-only";

import { cookies } from "next/headers";
import {
  SESSION_HOURS,
  allowedGitHubId,
  allowedGitHubUser,
  createSessionToken,
  developmentAuthBypass,
  verifySessionToken,
} from "./session-token";

export {
  allowedGitHubId,
  allowedGitHubUser,
  createSessionToken,
  developmentAuthBypass,
  verifySessionToken,
};
export type { GardenSession } from "./session-token";

export function sessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-garden_session" : "garden_session";
}

export function oauthStateCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-garden_oauth_state" : "garden_oauth_state";
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

export async function currentSession() {
  const store = await cookies();
  return verifySessionToken(store.get(sessionCookieName())?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
    priority: "high" as const,
  };
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
    priority: "high" as const,
  };
}

export async function isAdminRequest(request: Request) {
  if (developmentAuthBypass()) return true;
  const cookieHeader = request.headers.get("cookie") || "";
  const name = sessionCookieName().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return Boolean(await verifySessionToken(match?.[1]));
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestUrl = new URL(request.url);
    const requestHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;
    const requestProtocol = forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;
    return originUrl.host === requestHost && originUrl.protocol === requestProtocol;
  } catch {
    return false;
  }
}
