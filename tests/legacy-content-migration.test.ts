import { describe, expect, it } from "vitest";
import type { GardenPost } from "../app/admin/types";
import { gardenPostSchema } from "../app/lib/content-schema";
import { materializeLegacyPostImages } from "../app/lib/legacy-content-migration";

const legacyPost: GardenPost = {
  id: "post-legacy-1",
  title: "An old note",
  description: "",
  content: "Saved in the old studio.",
  status: "Draft",
  type: "Content",
  category: "Life",
  tags: [],
  slug: "an-old-note",
  coverImage: "",
  gallery: [],
  videoUrl: "",
  externalUrl: "",
  shelfCategory: "Books",
  shelfStatus: "",
  seoTitle: "An old note",
  seoDescription: "",
  updatedAt: "2026-08-31T10:00:00.000Z",
  publishedAt: "",
  likes: 0,
  bookmarks: 0,
  comments: 0,
  versions: [],
};

describe("legacy content migration", () => {
  it("uploads embedded cover and gallery images before importing a note", async () => {
    const firstImage = `data:image/png;base64,${btoa("first legacy image")}`;
    const secondImage = `data:image/jpeg;base64,${btoa("second legacy image")}`;
    const uploadedFiles: File[] = [];

    const [migrated] = await materializeLegacyPostImages([{
      ...legacyPost,
      coverImage: firstImage,
      gallery: [firstImage, "/uploads/already-stored.png", secondImage],
    }], async (file) => {
      uploadedFiles.push(file);
      return `/uploads/${file.name}`;
    });

    expect(uploadedFiles).toHaveLength(2);
    expect(uploadedFiles.map((file) => file.type)).toEqual(["image/png", "image/jpeg"]);
    expect(migrated.coverImage).toBe(`/uploads/${uploadedFiles[0].name}`);
    expect(migrated.gallery).toEqual([
      `/uploads/${uploadedFiles[0].name}`,
      "/uploads/already-stored.png",
      `/uploads/${uploadedFiles[1].name}`,
    ]);
    expect(gardenPostSchema.safeParse(migrated).success).toBe(true);
  });
});
