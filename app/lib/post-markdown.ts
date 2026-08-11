import matter from "gray-matter";
import type { GardenPost } from "../admin/types";
import { gardenPostSchema } from "./content-schema";

export function parsePostMarkdown(raw: string) {
  const parsed = matter(raw);
  const data = { ...parsed.data } as Record<string, unknown>;
  if (data.updatedAt instanceof Date) data.updatedAt = data.updatedAt.toISOString();
  if (data.publishedAt instanceof Date) data.publishedAt = data.publishedAt.toISOString();
  return gardenPostSchema.parse({ ...data, content: parsed.content.trim() });
}

export function serializePostMarkdown(post: GardenPost) {
  const validated = gardenPostSchema.parse(post);
  const frontmatter: Partial<GardenPost> = { ...validated };
  delete frontmatter.content;
  delete frontmatter.likes;
  delete frontmatter.bookmarks;
  delete frontmatter.comments;
  delete frontmatter.versions;
  return matter.stringify(`${validated.content.trim()}\n`, frontmatter);
}
