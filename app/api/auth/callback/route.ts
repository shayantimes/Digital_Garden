import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  allowedGitHubId,
  allowedGitHubUser,
  createSessionToken,
  oauthStateCookieName,
  publicSiteUrl,
  sessionCookieName,
  sessionCookieOptions,
} from "../../../lib/session";

type GitHubTokenResponse = { access_token?: string; error?: string };
type GitHubUser = { id?: number; login?: string };

function safeEqual(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function fail(request: Request, reason: string) {
  let base: URL;
  try { base = publicSiteUrl(request); }
  catch { base = new URL(new URL(request.url).origin); }
  const response = NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(reason)}`, base));
  response.cookies.set(oauthStateCookieName(), "", { path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return fail(request, "access_denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.headers.get("cookie")
    ?.split(";")
    .map((item) => item.trim().split("="))
    .find(([name]) => name === oauthStateCookieName())?.slice(1).join("=");

  if (!code || !safeEqual(state, storedState)) return fail(request, "invalid_state");

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return fail(request, "not_configured");

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: new URL("/api/auth/callback", publicSiteUrl(request)).toString(),
      }),
      cache: "no-store",
    });
    const token = await tokenResponse.json() as GitHubTokenResponse;
    if (!tokenResponse.ok || !token.access_token) return fail(request, "oauth_failed");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token.access_token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Shayan-Digital-Garden",
      },
      cache: "no-store",
    });
    const user = await userResponse.json() as GitHubUser;
    if (!userResponse.ok || !user.id || !user.login) return fail(request, "profile_failed");
    if (user.id !== allowedGitHubId() || user.login.toLowerCase() !== allowedGitHubUser()) return fail(request, "not_owner");

    const response = NextResponse.redirect(new URL("/admin", publicSiteUrl(request)));
    response.cookies.set(sessionCookieName(), await createSessionToken({ id: user.id, login: user.login }), sessionCookieOptions());
    response.cookies.set(oauthStateCookieName(), "", { path: "/", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return fail(request, "oauth_failed");
  }
}
