import "server-only";

import { identityMatchesOwner } from "./auth-validation";
import { readGardenAccount } from "./server-content";
import type { GardenAccount } from "./garden-types";

type SupabaseUser = {
  id?: string;
  email?: string;
  user_metadata?: { username?: string };
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
  if (ownerUserId) return user.id === ownerUserId;
  return user.email?.toLowerCase() === ownerEmail;
}

export function authConfigurationStatus() {
  const requiredNames = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "GARDEN_ADMIN_EMAIL", "GARDEN_ADMIN_USERNAME"] as const;
  const missing = requiredNames.filter((name) => !process.env[name]?.trim());
  return { configured: missing.length === 0, missing };
}

export function ownerSetupEnabled() {
  return process.env.GARDEN_OWNER_SETUP_ENABLED?.trim().toLowerCase() === "true";
}

async function ownerAccount() {
  const configured = config();
  return readGardenAccount().catch(() => ({ username: configured.ownerUsername, email: configured.ownerEmail, userId: configured.ownerUserId }));
}

export async function ownerIdentityMatches(identity: string) {
  const account = await ownerAccount();
  return identityMatchesOwner(identity, account.username, account.email);
}

export async function signInOwner(identity: string, password: string, forwardedIp?: string) {
  const { baseUrl, publishableKey, ownerUserId } = config();
  const account = await ownerAccount();
  const immutableOwnerId = account.userId || ownerUserId;
  if (!identityMatchesOwner(identity, account.username, account.email)) return null;
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      ...authHeaders(publishableKey),
      ...(forwardedIp ? { "Sb-Forwarded-For": forwardedIp } : {}),
    },
    body: JSON.stringify({ email: account.email, password }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const result = await response.json() as SupabaseTokenResponse;
  if (!result.access_token || !result.user || !isOwner(result.user, account.email, immutableOwnerId)) return null;
  return {
    accessToken: result.access_token,
    expiresIn: Math.min(Math.max(result.expires_in || 3_600, 300), 3_600),
    email: account.email,
    username: account.username,
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
  const { baseUrl, publishableKey, ownerUserId } = config();
  const account = await ownerAccount();
  const immutableOwnerId = account.userId || ownerUserId;
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: authHeaders(publishableKey, accessToken),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json() as SupabaseUser;
  if (!isOwner(user, account.email, immutableOwnerId)) return null;
  return { id: user.id || immutableOwnerId, email: account.email, username: account.username };
}

export async function updateOwnerCredentials(accessToken: string, account: GardenAccount, newPassword: string) {
  const { baseUrl, publishableKey } = config();
  const current = await ownerAccount();
  const owner = await verifyOwnerAccessToken(accessToken);
  if (!owner?.id) throw new Error("Your session has expired. Sign in again.");
  const body: Record<string, unknown> = { data: { username: account.username } };
  if (account.email.toLowerCase() !== current.email.toLowerCase()) body.email = account.email;
  if (newPassword) body.password = newPassword;
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(publishableKey, accessToken),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { msg?: string; message?: string } | null;
    throw new Error(details?.msg || details?.message || "The account could not be updated.");
  }
  return owner.id;
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
