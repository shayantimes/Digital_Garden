import type { GardenCategory, GardenPost } from "./garden-types";
import { normalizeGardenCategory } from "./garden-categories";

export type NowDestinationOption = {
  label: string;
  value: string;
};

export type NowDestinationGroup = {
  label: string;
  sectionValue: string;
  options: NowDestinationOption[];
};

function canonicalCategoryName(category: GardenCategory) {
  const value = category.id.replace(/^category-/, "");
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function buildNowDestinationOptions(categories: GardenCategory[], posts: GardenPost[]) {
  const sectionOptions = categories.map((category) => ({
    label: category.label,
    value: `/${category.slug}`,
  }));

  const contentGroups = categories.map((category) => {
    const canonicalCategory = canonicalCategoryName(category);
    const options = posts
      .filter((post) => post.status === "Published" && normalizeGardenCategory(post.category) === canonicalCategory)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((post) => ({
        label: post.title,
        value: `/${category.slug}/${post.slug}`,
      }));

    return { label: category.label, sectionValue: `/${category.slug}`, options };
  }).filter((group) => group.options.length > 0);

  return { sectionOptions, contentGroups };
}
