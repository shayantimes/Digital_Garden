import type { GardenSettings } from "./garden-types";

export const gardenSettings: GardenSettings = {
  headerName: "Shayan",
  profileImage: "",
  recentCount: 10,
  fieldNotes: "I explore, build, write, and share things that shape my mind and life. This is my space to grow in public.",
  profileRoles: "Marketer • Analyst • Builder",
  profileTitle: "Digital Gardener",
  photoCaption: "Building a life\nI don’t want to escape from.",
  fieldNoteQuote: "A garden is never\nfinished.\nIt just keeps\ngrowing.",
  gardenPromise: "I’m not here to be perfect.\nI’m here to be honest and\nkeep planting.",
  socialLinks: {
    email: "",
    github: "https://github.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  cvUrl: "",
  categories: [
    { id: "category-build", label: "Build", slug: "build", iconImage: "" },
    { id: "category-notes", label: "Notes", slug: "notes", iconImage: "" },
    { id: "category-shelf", label: "Shelf", slug: "shelf", iconImage: "" },
    { id: "category-life", label: "Life", slug: "life", iconImage: "" },
  ],
};
