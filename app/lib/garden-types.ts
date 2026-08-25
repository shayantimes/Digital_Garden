import type { ShelfCategory, ShelfStatus } from "./shelf";

export type PostStatus = "Published" | "Draft" | "Scheduled";

export type ContentType = "Content";

export type GardenCategory = {
  id: string;
  label: string;
  slug: string;
  iconImage: string;
};

export type GardenSettings = {
  headerName: string;
  profileImage: string;
  recentCount: number;
  categories: GardenCategory[];
};

export type PostVersion = {
  id: string;
  label: string;
  date: string;
};

export type GardenPost = {
  id: string;
  title: string;
  description: string;
  content: string;
  status: PostStatus;
  type: ContentType;
  category: string;
  tags: string[];
  slug: string;
  coverImage: string;
  gallery?: string[];
  videoUrl?: string;
  externalUrl?: string;
  shelfCategory?: ShelfCategory;
  shelfStatus?: ShelfStatus;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
  publishedAt: string;
  likes: number;
  bookmarks: number;
  comments: number;
  versions: PostVersion[];
};
