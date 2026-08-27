import { describe, expect, it } from "vitest";
import { normalizePost } from "../app/admin/settings";
import { isGardenCategory, normalizeGardenCategory } from "../app/lib/garden-categories";
import { gardenSettings } from "../app/lib/garden-config";
import { starterPosts } from "../app/lib/garden-data";

describe("unified notes section", () => {
  it("exposes Notes without a separate Lab category", () => {
    expect(gardenSettings.categories.map((category) => category.label)).toEqual(["Build", "Notes", "Shelf", "Life"]);
  });

  it("treats legacy Lab content as Notes", () => {
    const labPost = { ...starterPosts[0], category: "Lab" };

    expect(normalizeGardenCategory("Lab")).toBe("Notes");
    expect(isGardenCategory(labPost.category, "Notes")).toBe(true);
    expect(normalizePost(labPost).category).toBe("Notes");
  });
});
