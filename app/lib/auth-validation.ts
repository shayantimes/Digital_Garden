import { z } from "zod";

export const loginSchema = z.object({
  identity: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(1_024),
});

export const forgotPasswordSchema = z.object({
  identity: z.string().trim().min(1).max(254),
});

export const setupOwnerSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, dashes, or underscores."),
  email: z.email("Enter a valid email address.").trim(),
  password: z.string(),
}).superRefine((value, context) => {
  const password = strongPasswordSchema.safeParse(value.password);
  if (!password.success) {
    for (const issue of password.error.issues) context.addIssue({ ...issue, path: ["password"] });
  }
});

export const strongPasswordSchema = z.string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a symbol.");

export const accountUpdateSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, dashes, or underscores."),
  email: z.email("Enter a valid email address.").trim(),
  newPassword: z.string().max(128).default(""),
}).superRefine((value, context) => {
  if (!value.newPassword) return;
  const password = strongPasswordSchema.safeParse(value.newPassword);
  if (!password.success) {
    for (const issue of password.error.issues) context.addIssue({ ...issue, path: ["newPassword"] });
  }
});

export const resetPasswordSchema = z.object({
  accessToken: z.string().min(20).max(8_192),
  password: strongPasswordSchema,
});

export function normalizeIdentity(value: string) {
  return value.trim().toLowerCase();
}

export function identityMatchesOwner(identity: string, username: string, email: string) {
  const normalized = normalizeIdentity(identity);
  return normalized === normalizeIdentity(username) || normalized === normalizeIdentity(email);
}
