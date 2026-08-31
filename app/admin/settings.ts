import type { GardenPost, GardenSettings } from "./types";
import { normalizeGardenCategory } from "../lib/garden-categories";
import { normalizeShelfCategory, normalizeShelfStatus } from "../lib/shelf";

export const SETTINGS_KEY = "shayan-garden-settings-v1";
export const POSTS_KEY = "shayan-garden-posts-v1";
export const SETTINGS_EVENT = "garden-settings-change";

export const defaultGardenSettings: GardenSettings = {
  headerName: "Shayan",
  profileImage: "",
  recentCount: 10,
  fieldNotes: "I explore, build, write, and share things that shape my mind and life. This is my space to grow in public.",
  profileRoles: "Marketer • Analyst • Builder",
  profileTitle: "Digital Gardener",
  photoCaption: "Building a life\nI don’t want to escape from.",
  fieldNoteQuote: "A garden is never\nfinished.\nIt just keeps\ngrowing.",
  gardenPromise: "I’m not here to be perfect.\nI’m here to be honest and\nkeep planting.",
  socialLinks: {
    email: "",
    github: "https://github.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  cvUrl: "",
  categories: [
    { id: "category-build", label: "Build", slug: "build", iconImage: "" },
    { id: "category-notes", label: "Notes", slug: "notes", iconImage: "" },
    { id: "category-shelf", label: "Shelf", slug: "shelf", iconImage: "" },
    { id: "category-life", label: "Life", slug: "life", iconImage: "" },
  ],
};

export function slugifySetting(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeSettings(value: unknown): GardenSettings {
  if (!value || typeof value !== "object") return defaultGardenSettings;
  const candidate = value as Partial<GardenSettings>;
  const categories = Array.isArray(candidate.categories)
    ? candidate.categories
        .filter((category) => category && typeof category.label === "string")
        .map((category, index) => ({
          id: category.id || `category-${index}-${slugifySetting(category.label)}`,
          label: category.label.trim() || `Section ${index + 1}`,
          slug: slugifySetting(category.slug || category.label) || `section-${index + 1}`,
          iconImage: typeof category.iconImage === "string" ? category.iconImage : "",
        }))
    : defaultGardenSettings.categories;
  return {
    headerName: typeof candidate.headerName === "string" && candidate.headerName.trim()
      ? candidate.headerName.trim()
      : defaultGardenSettings.headerName,
    profileImage: typeof candidate.profileImage === "string" ? candidate.profileImage : "",
    recentCount: typeof candidate.recentCount === "number" && Number.isFinite(candidate.recentCount)
      ? Math.min(30, Math.max(1, Math.round(candidate.recentCount)))
      : defaultGardenSettings.recentCount,
    fieldNotes: typeof candidate.fieldNotes === "string"
      ? candidate.fieldNotes.trim().slice(0, 1_200)
      : defaultGardenSettings.fieldNotes,
    profileRoles: typeof candidate.profileRoles === "string"
      ? candidate.profileRoles.trim().slice(0, 180)
      : defaultGardenSettings.profileRoles,
    profileTitle: typeof candidate.profileTitle === "string"
      ? candidate.profileTitle.trim().slice(0, 100)
      : defaultGardenSettings.profileTitle,
    photoCaption: typeof candidate.photoCaption === "string"
      ? candidate.photoCaption.trim().slice(0, 280)
      : defaultGardenSettings.photoCaption,
    fieldNoteQuote: typeof candidate.fieldNoteQuote === "string"
      ? candidate.fieldNoteQuote.trim().slice(0, 400)
      : defaultGardenSettings.fieldNoteQuote,
    gardenPromise: typeof candidate.gardenPromise === "string"
      ? candidate.gardenPromise.trim().slice(0, 400)
      : defaultGardenSettings.gardenPromise,
    socialLinks: {
      email: typeof candidate.socialLinks?.email === "string" ? candidate.socialLinks.email.trim() : "",
      github: typeof candidate.socialLinks?.github === "string" ? candidate.socialLinks.github.trim() : "",
      instagram: typeof candidate.socialLinks?.instagram === "string" ? candidate.socialLinks.instagram.trim() : "",
      linkedin: typeof candidate.socialLinks?.linkedin === "string" ? candidate.socialLinks.linkedin.trim() : "",
      x: typeof candidate.socialLinks?.x === "string" ? candidate.socialLinks.x.trim() : "",
    },
    cvUrl: typeof candidate.cvUrl === "string" ? candidate.cvUrl.trim() : "",
    categories: categories.length ? categories : defaultGardenSettings.categories,
  };
}

export function normalizePost(post: GardenPost): GardenPost {
  const category = normalizeGardenCategory(post.category);
  const shelfCategory = normalizeShelfCategory(post.shelfCategory);
  return {
    ...post,
    type: "Content",
    category,
    gallery: Array.isArray(post.gallery) ? post.gallery : [],
    videoUrl: post.videoUrl || "",
    externalUrl: post.externalUrl || "",
    shelfCategory,
    shelfStatus: category === "Shelf" ? normalizeShelfStatus(shelfCategory, post.shelfStatus) : post.shelfStatus || "",
  };
}
