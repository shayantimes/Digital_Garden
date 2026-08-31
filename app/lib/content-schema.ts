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

const optionalNowUrl = z.string().max(2_000).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Use a garden path or a valid HTTP or HTTPS URL.");

const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address.")]);

export const gardenSettingsSchema = z.object({
  headerName: z.string().trim().min(1).max(80),
  profileImage: optionalAssetUrl.default(""),
  recentCount: z.number().int().min(1).max(30).default(10),
  fieldNotes: z.string().trim().max(1_200).default(""),
  profileRoles: z.string().trim().max(180).default("Marketer • Analyst • Builder"),
  profileTitle: z.string().trim().max(100).default("Digital Gardener"),
  photoCaption: z.string().trim().max(280).default("Building a life\nI don’t want to escape from."),
  fieldNoteQuote: z.string().trim().max(400).default("A garden is never\nfinished.\nIt just keeps\ngrowing."),
  gardenPromise: z.string().trim().max(400).default("I’m not here to be perfect.\nI’m here to be honest and\nkeep planting."),
  socialLinks: z.object({
    email: optionalEmail.default(""),
    github: optionalExternalUrl.default(""),
    instagram: optionalExternalUrl.default(""),
    linkedin: optionalExternalUrl.default(""),
    x: optionalExternalUrl.default(""),
  }),
  cvUrl: z.string().max(2_000).refine((value) => !value || value.startsWith("/uploads/") || (() => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  })(), "Use an uploaded CV or an HTTPS URL.").default(""),
  categories: z.array(z.object({
    id: z.enum(["category-build", "category-notes", "category-shelf", "category-life"]),
    label: z.string().trim().min(1).max(40),
    slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    iconImage: optionalAssetUrl.default(""),
  })).length(4),
});

export const gardenAccountSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, dashes, or underscores."),
  email: z.email("Enter a valid email address.").trim(),
  userId: z.union([z.literal(""), z.uuid("Use a valid Supabase user ID.")]).default(""),
});

export const gardenNowItemSchema = z.object({
  id: z.string().min(5).max(100).regex(/^now-[a-zA-Z0-9-]+$/),
  label: z.string().trim().max(50).default(""),
  title: z.string().trim().min(1).max(180),
  url: optionalNowUrl.default(""),
});

export const gardenNowArraySchema = z.array(gardenNowItemSchema).max(5);

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
