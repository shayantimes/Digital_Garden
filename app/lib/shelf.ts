export const shelfCategories = ["Books", "Movies", "Shows", "Music", "Games"] as const;

export type ShelfCategory = (typeof shelfCategories)[number];

export const shelfStatuses = {
  Books: ["Read", "Reading", "To Read"],
  Movies: ["Watched", "Watching", "Watchlist"],
  Shows: ["Watched", "Watching", "Watchlist"],
  Music: [],
  Games: ["Played", "Playing", "To Play"],
} as const satisfies Record<ShelfCategory, readonly string[]>;

export type ShelfStatus = (typeof shelfStatuses)[Exclude<ShelfCategory, "Music">][number] | "";

export function normalizeShelfCategory(value: unknown): ShelfCategory {
  return shelfCategories.includes(value as ShelfCategory) ? value as ShelfCategory : "Books";
}

export function normalizeShelfStatus(category: ShelfCategory, value: unknown): ShelfStatus {
  if (category === "Music") return "";
  const options = shelfStatuses[category] as readonly string[];
  return options.includes(value as string) ? value as ShelfStatus : options[options.length - 1] as ShelfStatus;
}

export function shelfStatusTone(status: ShelfStatus) {
  if (["Read", "Watched", "Played"].includes(status)) return "complete";
  if (["Reading", "Watching", "Playing"].includes(status)) return "active";
  return "planned";
}
