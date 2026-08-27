import type { GardenPost } from "../admin/types";
import type { GardenNowItem } from "./garden-types";
import { normalizePost, POSTS_KEY } from "../admin/settings";

const DATABASE_NAME = "shayan-digital-garden";
const DATABASE_VERSION = 1;
const STORE_NAME = "content";
const POSTS_RECORD = "posts";

export const CONTENT_EVENT = "garden-content-change";

type ContentResponse = {
  posts?: GardenPost[];
  source?: "github" | "local";
  backend?: "github" | "local";
  error?: string;
};

type NowResponse = {
  items?: GardenNowItem[];
  source?: "github" | "local";
  backend?: "github" | "local";
  error?: string;
};

export async function fetchGardenPosts() {
  const response = await fetch("/api/content", { cache: "no-store" });
  const result = (await response.json()) as ContentResponse;
  if (!response.ok) throw new Error(result.error || "Your garden could not be loaded.");
  return {
    posts: (result.posts || []).map(normalizePost),
    source: result.source || "local",
    backend: result.backend || "local",
  };
}

export async function fetchGardenNow() {
  const response = await fetch("/api/now", { cache: "no-store" });
  const result = (await response.json()) as NowResponse;
  if (!response.ok) throw new Error(result.error || "The Now section could not be loaded.");
  return {
    items: result.items || [],
    source: result.source || "local",
    backend: result.backend || "local",
  };
}

// Compatibility for the existing public frontend while content moves from
// browser storage to the authenticated server-backed repository.
export async function loadGardenPosts(): Promise<GardenPost[] | undefined> {
  try {
    return (await fetchGardenPosts()).posts;
  } catch {
    return [];
  }
}

async function parseMutationResponse(response: Response, fallback: string) {
  const result = (await response.json()) as { source?: "github" | "local"; error?: string };
  if (!response.ok) throw new Error(result.error || fallback);
  window.dispatchEvent(new CustomEvent(CONTENT_EVENT));
  return result.source || "local";
}

export async function saveGardenPost(post: GardenPost) {
  const response = await fetch("/api/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ post: normalizePost(post) }),
  });
  return parseMutationResponse(response, "Your changes could not be published.");
}

export async function saveGardenNow(items: GardenNowItem[]) {
  const response = await fetch("/api/now", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  return parseMutationResponse(response, "The Now section could not be saved.");
}

export async function importGardenPosts(posts: GardenPost[]) {
  const response = await fetch("/api/content/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posts: posts.map(normalizePost) }),
  });
  return parseMutationResponse(response, "Those notes could not be imported.");
}

export async function removeGardenPost(id: string) {
  const response = await fetch("/api/content", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return parseMutationResponse(response, "That note could not be removed.");
}

function openLegacyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the old content store."));
  });
}

export async function loadLegacyGardenPosts(): Promise<GardenPost[]> {
  if (typeof window === "undefined") return [];
  try {
    const database = await openLegacyDatabase();
    const posts = await new Promise<GardenPost[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(POSTS_RECORD);
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result.map(normalizePost) : []);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (posts.length) return posts;
  } catch {
    // The localStorage fallback below may still contain the old studio data.
  }
  try {
    const stored = window.localStorage.getItem(POSTS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map(normalizePost) : [];
  } catch {
    return [];
  }
}

export async function uploadGardenImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/media", { method: "POST", body: form });
  const result = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error || "That image could not be uploaded.");
  return result.url;
}
