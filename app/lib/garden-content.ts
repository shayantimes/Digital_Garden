import type { GardenPost } from "../admin/types";
import { normalizePost, POSTS_KEY } from "../admin/settings";

const DATABASE_NAME = "shayan-digital-garden";
const DATABASE_VERSION = 1;
const STORE_NAME = "content";
const POSTS_RECORD = "posts";

export const CONTENT_EVENT = "garden-content-change";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the content database."));
  });
}

function getStoredPosts(database: IDBDatabase): Promise<GardenPost[] | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(POSTS_RECORD);
    request.onsuccess = () => {
      const value = request.result;
      resolve(Array.isArray(value) ? (value as GardenPost[]).map(normalizePost) : undefined);
    };
    request.onerror = () => reject(request.error || new Error("Could not read saved content."));
  });
}

function putStoredPosts(database: IDBDatabase, posts: GardenPost[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(posts, POSTS_RECORD);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save content."));
    transaction.onabort = () => reject(transaction.error || new Error("Saving content was interrupted."));
  });
}

function loadLegacyPosts(): GardenPost[] | undefined {
  const legacy = window.localStorage.getItem(POSTS_KEY);
  if (!legacy) return undefined;
  try {
    const parsed = JSON.parse(legacy);
    return Array.isArray(parsed) ? (parsed as GardenPost[]).map(normalizePost) : undefined;
  } catch {
    window.localStorage.removeItem(POSTS_KEY);
    return undefined;
  }
}

function saveLightweightFallback(posts: GardenPost[]) {
  const withoutLargeImages = posts.map((post) => ({
    ...post,
    coverImage: "",
    gallery: [],
  }));
  try {
    window.localStorage.setItem(POSTS_KEY, JSON.stringify(withoutLargeImages));
  } catch {
    // IndexedDB remains the source of truth if the small compatibility copy cannot be written.
  }
}

export async function loadGardenPosts(): Promise<GardenPost[] | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const database = await openDatabase();
    const stored = await getStoredPosts(database);
    database.close();
    if (stored !== undefined) return stored;
  } catch {
    // Older/private browsers can still use the compatibility copy below.
  }

  const legacy = loadLegacyPosts();
  if (legacy !== undefined) {
    try {
      await saveGardenPosts(legacy, false);
    } catch {
      // The legacy content is still usable for this session.
    }
  }
  return legacy;
}

export async function saveGardenPosts(posts: GardenPost[], announce = true): Promise<void> {
  if (typeof window === "undefined") return;
  const database = await openDatabase();
  try {
    await putStoredPosts(database, posts.map(normalizePost));
  } finally {
    database.close();
  }
  saveLightweightFallback(posts);
  if (announce) window.dispatchEvent(new CustomEvent(CONTENT_EVENT));
}
