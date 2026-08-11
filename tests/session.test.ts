import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "../app/lib/session-token";

const originalEnvironment = { ...process.env };

describe("owner sessions", () => {
  beforeEach(() => {
    process.env.GARDEN_SESSION_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
    process.env.GARDEN_ADMIN_GITHUB_USER = "shayantimes";
    process.env.GARDEN_ADMIN_GITHUB_ID = "140486239";
    process.env.GARDEN_DEV_BYPASS_AUTH = "false";
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("accepts a signed session only for the configured immutable GitHub identity", async () => {
    const token = await createSessionToken({ id: 140486239, login: "ShayanTimes" });
    const session = await verifySessionToken(token);

    expect(session).toMatchObject({ githubId: 140486239, login: "shayantimes", role: "owner" });
  });

  it("rejects a modified token", async () => {
    const token = await createSessionToken({ id: 140486239, login: "shayantimes" });
    const lastCharacter = token.at(-1) === "a" ? "b" : "a";

    expect(await verifySessionToken(`${token.slice(0, -1)}${lastCharacter}`)).toBeNull();
  });

  it("invalidates existing sessions if the permitted account changes", async () => {
    const token = await createSessionToken({ id: 140486239, login: "shayantimes" });
    process.env.GARDEN_ADMIN_GITHUB_ID = "1";

    expect(await verifySessionToken(token)).toBeNull();
  });
});
