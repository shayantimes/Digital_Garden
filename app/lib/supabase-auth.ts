import "server-only";

import { identityMatchesOwner } from "./auth-validation";

type SupabaseUser = {
  id?: string;
  email?: string;
};

type SupabaseTokenResponse = {
  access_token?: string;
  expires_in?: number;
  user?: SupabaseUser;
};

type SupabaseSignupResponse = {
  user?: SupabaseUser;
  access_token?: string;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function config() {
  const url = new URL(required("SUPABASE_URL"));
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("SUPABASE_URL must use HTTPS in production.");
  }
  return {
    baseUrl: url.origin,
    publishableKey: required("SUPABASE_PUBLISHABLE_KEY"),
    ownerEmail: required("GARDEN_ADMIN_EMAIL").toLowerCase(),
    ownerUsername: required("GARDEN_ADMIN_USERNAME").toLowerCase(),
    ownerUserId: process.env.GARDEN_ADMIN_USER_ID?.trim() || "",
  };
}

function authHeaders(publishableKey: string, accessToken?: string) {
  return {
    apikey: publishableKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function isOwner(user: SupabaseUser, ownerEmail: string, ownerUserId: string) {
  return user.email?.toLowerCase() === ownerEmail && (!ownerUserId || user.id === ownerUserId);
}

export function authConfigurationStatus() {
  const requiredNames = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "GARDEN_ADMIN_EMAIL", "GARDEN_ADMIN_USERNAME"] as const;
  const missing = requiredNames.filter((name) => !process.env[name]?.trim());
  return { configured: missing.length === 0, missing };
}

export function ownerSetupEnabled() {
  return process.env.GARDEN_OWNER_SETUP_ENABLED?.trim().toLowerCase() === "true";
}

export function ownerIdentityMatches(identity: string) {
  const { ownerEmail, ownerUsername } = config();
  return identityMatchesOwner(identity, ownerUsername, ownerEmail);
}

export async function signInOwner(identity: string, password: string, forwardedIp?: string) {
  const { baseUrl, publishableKey, ownerEmail, ownerUsername, ownerUserId } = config();
  if (!identityMatchesOwner(identity, ownerUsername, ownerEmail)) return null;
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      ...authHeaders(publishableKey),
      ...(forwardedIp ? { "Sb-Forwarded-For": forwardedIp } : {}),
    },
    body: JSON.stringify({ email: ownerEmail, password }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const result = await response.json() as SupabaseTokenResponse;
  if (!result.access_token || !result.user || !isOwner(result.user, ownerEmail, ownerUserId)) return null;
  return {
    accessToken: result.access_token,
    expiresIn: Math.min(Math.max(result.expires_in || 3_600, 300), 3_600),
    email: ownerEmail,
    username: ownerUsername,
  };
}

export async function createOwnerAccount(username: string, email: string, password: string, redirectTo: string, forwardedIp?: string) {
  const { baseUrl, publishableKey, ownerEmail, ownerUsername } = config();
  if (!identityMatchesOwner(username, ownerUsername, ownerEmail) || email.trim().toLowerCase() !== ownerEmail) return null;
  const response = await fetch(`${baseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: {
      ...authHeaders(publishableKey),
      ...(forwardedIp ? { "Sb-Forwarded-For": forwardedIp } : {}),
    },
    body: JSON.stringify({ email: ownerEmail, password, data: { username: ownerUsername } }),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { msg?: string; message?: string } | null;
    throw new Error(details?.msg || details?.message || "The owner account could not be created.");
  }
  const result = await response.json() as SupabaseSignupResponse;
  return { confirmationRequired: !result.access_token, userId: result.user?.id || "" };
}

export async function verifyOwnerAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;
  const { baseUrl, publishableKey, ownerEmail, ownerUsername, ownerUserId } = config();
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: authHeaders(publishableKey, accessToken),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json() as SupabaseUser;
  if (!isOwner(user, ownerEmail, ownerUserId)) return null;
  return { id: ownerUserId, email: ownerEmail, username: ownerUsername };
}

export async function sendOwnerPasswordReset(redirectTo: string, forwardedIp?: string) {
  const { baseUrl, publishableKey, ownerEmail } = config();
  const response = await fetch(`${baseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: {
      ...authHeaders(publishableKey),
      ...(forwardedIp ? { "Sb-Forwarded-For": forwardedIp } : {}),
    },
    body: JSON.stringify({ email: ownerEmail, redirect_to: redirectTo }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Password reset email could not be requested.");
}

export async function updateOwnerPassword(accessToken: string, password: string) {
  const owner = await verifyOwnerAccessToken(accessToken);
  if (!owner) return false;
  const { baseUrl, publishableKey } = config();
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(publishableKey, accessToken),
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  return response.ok;
}
