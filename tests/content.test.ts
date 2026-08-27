import { describe, expect, it } from "vitest";
import { gardenNowArraySchema, gardenPostSchema } from "../app/lib/content-schema";
import { parsePostMarkdown, serializePostMarkdown } from "../app/lib/post-markdown";
import type { GardenPost } from "../app/admin/types";

const post: GardenPost = {
  id: "post-test-1",
  title: "A safe note",
  description: "A short description.",
  content: "## Hello\n\nThis is **Markdown**.",
  status: "Draft",
  type: "Content",
  category: "Notes",
  tags: ["test"],
  slug: "a-safe-note",
  coverImage: "",
  gallery: [],
  videoUrl: "",
  externalUrl: "https://example.com",
  shelfCategory: "Books",
  shelfStatus: "",
  seoTitle: "A safe note",
  seoDescription: "A short description.",
  updatedAt: "2026-08-11T10:00:00.000Z",
  publishedAt: "",
  likes: 0,
  bookmarks: 0,
  comments: 0,
  versions: [],
};

describe("garden content", () => {
  it("round-trips a note through Markdown frontmatter", () => {
    const restored = parsePostMarkdown(serializePostMarkdown(post));
    expect(restored).toEqual(post);
  });

  it("rejects traversal-like IDs and unsafe asset URLs", () => {
    expect(gardenPostSchema.safeParse({ ...post, id: "../../secrets" }).success).toBe(false);
    expect(gardenPostSchema.safeParse({ ...post, coverImage: "javascript:alert(1)" }).success).toBe(false);
  });

  it("limits content, tags, and metadata", () => {
    expect(gardenPostSchema.safeParse({ ...post, title: "x".repeat(181) }).success).toBe(false);
    expect(gardenPostSchema.safeParse({ ...post, tags: Array.from({ length: 31 }, (_, index) => `tag-${index}`) }).success).toBe(false);
  });

  it("accepts safe Now items and rejects unsafe or oversized lists", () => {
    const item = { id: "now-test-item", label: "Reading", title: "A useful book", url: "/shelf" };
    expect(gardenNowArraySchema.safeParse([item, { ...item, id: "now-external-item", url: "https://example.com" }]).success).toBe(true);
    expect(gardenNowArraySchema.safeParse([{ ...item, url: "javascript:alert(1)" }]).success).toBe(false);
    expect(gardenNowArraySchema.safeParse(Array.from({ length: 6 }, (_, index) => ({ ...item, id: `now-item-${index}` }))).success).toBe(false);
  });
});
