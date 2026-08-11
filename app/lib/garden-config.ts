import type { GardenSettings } from "./garden-types";

export const gardenSettings: GardenSettings = {
  headerName: "Shayan",
  profileImage: "",
  recentCount: 10,
  categories: [
    { id: "category-build", label: "Build", slug: "build", iconImage: "" },
    { id: "category-lab", label: "Lab", slug: "lab", iconImage: "" },
    { id: "category-notes", label: "Notes", slug: "notes", iconImage: "" },
    { id: "category-shelf", label: "Shelf", slug: "shelf", iconImage: "" },
    { id: "category-life", label: "Life", slug: "life", iconImage: "" },
  ],
};
