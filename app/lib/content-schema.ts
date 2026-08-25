import { z } from "zod";

const optionalAssetUrl = z.string().max(2_000).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/uploads/")) return true;
  if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,/i.test(value)) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use an uploaded image path or an HTTPS URL.");

const optionalExternalUrl = z.string().max(2_000).refine((value) => {
  if (!value) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Use a valid HTTP or HTTPS URL.");

export const gardenPostSchema = z.object({
  id: z.string().min(3).max(100).regex(/^post-[a-zA-Z0-9-]+$/),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(600).default(""),
  content: z.string().max(500_000).default(""),
  status: z.enum(["Published", "Draft", "Scheduled"]).default("Draft"),
  type: z.literal("Content").default("Content"),
  category: z.string().trim().min(1).max(60).default("Notes"),
  tags: z.array(z.string().trim().min(1).max(50).regex(/^[^#,]+$/)).max(30).default([]),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  coverImage: optionalAssetUrl.default(""),
  gallery: z.array(optionalAssetUrl).max(40).default([]),
  videoUrl: optionalExternalUrl.default(""),
  externalUrl: optionalExternalUrl.default(""),
  shelfCategory: z.enum(["Books", "Movies", "Shows", "Music", "Games"]).optional(),
  shelfStatus: z.enum(["", "Read", "Reading", "To Read", "Watched", "Watching", "Watchlist", "Played", "Playing", "To Play"]).optional(),
  seoTitle: z.string().trim().max(180).default(""),
  seoDescription: z.string().trim().max(600).default(""),
  updatedAt: z.iso.datetime(),
  publishedAt: z.union([z.literal(""), z.iso.datetime()]).default(""),
  likes: z.number().int().nonnegative().default(0),
  bookmarks: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  versions: z.array(z.object({
    id: z.string().max(100),
    label: z.string().max(120),
    date: z.string().max(120),
  })).max(100).default([]),
});

export const gardenPostArraySchema = z.array(gardenPostSchema).max(100);

export function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "post"}: ${issue.message}`).join("; ");
}
