import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { oauthCookieOptions, oauthStateCookieName, publicSiteUrl } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  let siteUrl: URL;
  try { siteUrl = publicSiteUrl(request); }
  catch { return NextResponse.redirect(new URL("/admin/login?error=not_configured", request.url)); }
  if (!clientId) return NextResponse.redirect(new URL("/admin/login?error=not_configured", siteUrl));

  const state = randomBytes(32).toString("base64url");
  const callbackUrl = new URL("/api/auth/callback", siteUrl);
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl.toString());
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "false");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(oauthStateCookieName(), state, oauthCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
