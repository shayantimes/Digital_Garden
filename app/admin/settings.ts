import type { GardenPost, GardenSettings } from "./types";

export const SETTINGS_KEY = "shayan-garden-settings-v1";
export const POSTS_KEY = "shayan-garden-posts-v1";
export const SETTINGS_EVENT = "garden-settings-change";

export const defaultGardenSettings: GardenSettings = {
  headerName: "Shayan",
  categories: [
    { id: "category-build", label: "Build", slug: "build" },
    { id: "category-lab", label: "Lab", slug: "lab" },
    { id: "category-notes", label: "Notes", slug: "notes" },
    { id: "category-shelf", label: "Shelf", slug: "shelf" },
    { id: "category-life", label: "Life", slug: "life" },
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
        }))
    : defaultGardenSettings.categories;
  return {
    headerName: typeof candidate.headerName === "string" && candidate.headerName.trim()
      ? candidate.headerName.trim()
      : defaultGardenSettings.headerName,
    categories: categories.length ? categories : defaultGardenSettings.categories,
  };
}

export function normalizePost(post: GardenPost): GardenPost {
  const legacyCategories: Record<string, string> = {
    Thinking: "Notes",
    Learning: "Lab",
  };
  return {
    ...post,
    type: "Content",
    category: legacyCategories[post.category] || post.category || "Notes",
    gallery: Array.isArray(post.gallery) ? post.gallery : [],
    videoUrl: post.videoUrl || "",
    externalUrl: post.externalUrl || "",
  };
}
