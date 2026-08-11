import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "shayan-digital-garden";
const AUDIENCE = "garden-studio";
export const SESSION_HOURS = 12;

export type GardenSession = JWTPayload & {
  githubId: number;
  login: string;
  role: "owner";
};

export function allowedGitHubUser() {
  return (process.env.GARDEN_ADMIN_GITHUB_USER || "shayantimes").trim().toLowerCase();
}

export function allowedGitHubId() {
  return Number(process.env.GARDEN_ADMIN_GITHUB_ID || "140486239");
}

export function developmentAuthBypass() {
  return process.env.NODE_ENV !== "production" && process.env.GARDEN_DEV_BYPASS_AUTH === "true";
}

function sessionKey() {
  const secret = process.env.GARDEN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("GARDEN_SESSION_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: { id: number; login: string }) {
  return new SignJWT({
    githubId: user.id,
    login: user.login.toLowerCase(),
    role: "owner",
  } satisfies Omit<GardenSession, keyof JWTPayload>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(String(user.id))
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(sessionKey());
}

export async function verifySessionToken(token?: string | null): Promise<GardenSession | null> {
  if (developmentAuthBypass()) {
    return { githubId: allowedGitHubId(), login: allowedGitHubUser(), role: "owner" };
  }
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 5,
    });
    const session = payload as GardenSession;
    if (
      session.role !== "owner" ||
      session.login?.toLowerCase() !== allowedGitHubUser() ||
      session.githubId !== allowedGitHubId()
    ) return null;
    return session;
  } catch {
    return null;
  }
}
