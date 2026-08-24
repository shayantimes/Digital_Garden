import { describe, expect, it } from "vitest";
import { identityMatchesOwner, loginSchema, setupOwnerSchema, strongPasswordSchema } from "../app/lib/auth-validation";

describe("admin credential validation", () => {
  it("accepts the owner username or email without case sensitivity", () => {
    expect(identityMatchesOwner("Shayan", "shayan", "owner@example.com")).toBe(true);
    expect(identityMatchesOwner("OWNER@EXAMPLE.COM", "shayan", "owner@example.com")).toBe(true);
    expect(identityMatchesOwner("another-user", "shayan", "owner@example.com")).toBe(false);
  });

  it("requires both an identity and password", () => {
    expect(loginSchema.safeParse({ identity: "shayan", password: "a password" }).success).toBe(true);
    expect(loginSchema.safeParse({ identity: "", password: "" }).success).toBe(false);
  });

  it("enforces a strong replacement password", () => {
    expect(strongPasswordSchema.safeParse("weak-password").success).toBe(false);
    expect(strongPasswordSchema.safeParse("A-strong-password-2026").success).toBe(true);
  });

  it("validates one-time owner account creation", () => {
    expect(setupOwnerSchema.safeParse({ username: "shayanzi79", email: "owner@example.com", password: "A-strong-password-2026" }).success).toBe(true);
    expect(setupOwnerSchema.safeParse({ username: "bad name", email: "not-email", password: "weak" }).success).toBe(false);
  });
});
