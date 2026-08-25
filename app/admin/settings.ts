import type { GardenPost, GardenSettings } from "./types";
import { normalizeShelfCategory, normalizeShelfStatus } from "../lib/shelf";

export const SETTINGS_KEY = "shayan-garden-settings-v1";
export const POSTS_KEY = "shayan-garden-posts-v1";
export const SETTINGS_EVENT = "garden-settings-change";

export const defaultGardenSettings: GardenSettings = {
  headerName: "Shayan",
  profileImage: "",
  recentCount: 10,
  categories: [
    { id: "category-build", label: "Build", slug: "build", iconImage: "" },
    { id: "category-lab", label: "Lab", slug: "lab", iconImage: "" },
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
    categories: categories.length ? categories : defaultGardenSettings.categories,
  };
}

export function normalizePost(post: GardenPost): GardenPost {
  const legacyCategories: Record<string, string> = {
    Thinking: "Notes",
    Learning: "Lab",
  };
  const category = legacyCategories[post.category] || post.category || "Notes";
  const shelfCategory = normalizeShelfCategory(post.shelfCategory);
  return {
    ...post,
    type: "Content",
    category,
    gallery: Array.isArray(post.gallery) ? post.gallery : [],
    videoUrl: post.videoUrl || "",
    externalUrl: post.externalUrl || "",
    shelfCategory,
    shelfStatus: category === "Shelf"
      ? normalizeShelfStatus(shelfCategory, post.shelfStatus)
      : post.shelfStatus || "",
  };
}
