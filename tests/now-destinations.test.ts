import { describe, expect, it } from "vitest";
import { buildNowDestinationOptions } from "../app/lib/now-destinations";
import type { GardenCategory, GardenPost } from "../app/lib/garden-types";

const categories: GardenCategory[] = [
  { id: "category-build", label: "Projects", slug: "work", iconImage: "" },
  { id: "category-notes", label: "Notes", slug: "notes", iconImage: "" },
  { id: "category-shelf", label: "Shelf", slug: "shelf", iconImage: "" },
  { id: "category-life", label: "Life", slug: "life", iconImage: "" },
];

function post(overrides: Partial<GardenPost>): GardenPost {
  return {
    id: "post-test",
    title: "A project",
    description: "",
    content: "",
    status: "Published",
    type: "Content",
    category: "Build",
    tags: [],
    slug: "a-project",
    coverImage: "",
    gallery: [],
    videoUrl: "",
    externalUrl: "",
    seoTitle: "",
    seoDescription: "",
    updatedAt: "2026-08-30T00:00:00.000Z",
    publishedAt: "2026-08-30T00:00:00.000Z",
    likes: 0,
    bookmarks: 0,
    comments: 0,
    versions: [],
    ...overrides,
  };
}

describe("Now destinations", () => {
  it("builds exact published-item links using the configured section slugs", () => {
    const result = buildNowDestinationOptions(categories, [
      post({ id: "post-build", title: "Digital Garden v2", slug: "digital-garden-v2" }),
      post({ id: "post-movie", title: "A film", category: "Shelf", slug: "a-film" }),
      post({ id: "post-draft", title: "Private draft", category: "Notes", slug: "private-draft", status: "Draft" }),
    ]);

    expect(result.sectionOptions[0]).toEqual({ label: "Projects", value: "/work" });
    expect(result.contentGroups).toEqual([
      { label: "Projects", sectionValue: "/work", options: [{ label: "Digital Garden v2", value: "/work/digital-garden-v2" }] },
      { label: "Shelf", sectionValue: "/shelf", options: [{ label: "A film", value: "/shelf/a-film" }] },
    ]);
  });
});
