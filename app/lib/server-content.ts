import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { GardenPost } from "../admin/types";
import type { GardenNowItem } from "./garden-types";
import { gardenNowArraySchema, gardenPostSchema } from "./content-schema";
import { starterNowItems } from "./garden-data";
import { parsePostMarkdown, serializePostMarkdown } from "./post-markdown";

const CONTENT_DIRECTORY = "content/posts";
const LOCAL_CONTENT_DIRECTORY = path.join(process.cwd(), CONTENT_DIRECTORY);
const NOW_FILE = "content/now.json";
const DEFAULT_REPOSITORY = "shayantimes/Digital_Garden";

type GitHubFile = { content?: string; sha?: string };
type GitHubDirectoryItem = { name: string; path: string; sha: string; type: "file" | "dir" };

function githubConfig() {
  const token = process.env.GARDEN_GITHUB_TOKEN?.trim();
  const repository = (process.env.GARDEN_GITHUB_REPO || DEFAULT_REPOSITORY).trim();
  const branch = (process.env.GARDEN_GITHUB_BRANCH || "main").trim();
  return token ? { token, repository, branch } : null;
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Shayan-Digital-Garden",
  };
}

function githubContentsUrl(repository: string, filePath: string, branch?: string) {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${repository}/contents/${encodedPath}`;
  return branch ? `${url}?ref=${encodeURIComponent(branch)}` : url;
}

async function githubRequest<T>(filePath: string): Promise<T | null> {
  const config = githubConfig();
  if (!config) return null;
  const response = await fetch(githubContentsUrl(config.repository, filePath, config.branch), {
    headers: githubHeaders(config.token),
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub content request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

async function readGitHubFile(filePath: string) {
  return githubRequest<GitHubFile>(filePath);
}

async function readGitHubPosts() {
  const directory = await githubRequest<GitHubDirectoryItem[]>(CONTENT_DIRECTORY);
  if (!directory) return [];
  if (!Array.isArray(directory)) throw new Error("The GitHub posts path is not a directory.");
  const files = directory.filter((item) => item.type === "file" && item.name.endsWith(".md"));
  const posts = await Promise.all(files.map(async (item) => {
    const file = await readGitHubFile(item.path);
    if (!file?.content) throw new Error(`GitHub returned an empty content file: ${item.name}`);
    return parsePostMarkdown(Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8"));
  }));
  return posts;
}

async function readLocalPosts() {
  await fs.mkdir(LOCAL_CONTENT_DIRECTORY, { recursive: true });
  const entries = await fs.readdir(LOCAL_CONTENT_DIRECTORY, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
  return Promise.all(files.map(async (file) => parsePostMarkdown(
    await fs.readFile(path.join(LOCAL_CONTENT_DIRECTORY, file.name), "utf8"),
  )));
}

function parseNowItems(raw: string) {
  return gardenNowArraySchema.parse(JSON.parse(raw));
}

async function readGitHubNow() {
  const file = await readGitHubFile(NOW_FILE);
  if (!file?.content) return starterNowItems;
  return parseNowItems(Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8"));
}

async function readLocalNow() {
  try {
    return parseNowItems(await fs.readFile(path.join(process.cwd(), NOW_FILE), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return starterNowItems;
    throw error;
  }
}

export async function readGardenPosts(options: { live?: boolean } = {}) {
  const source = options.live && githubConfig() ? "github" : "local";
  const posts = source === "github" ? await readGitHubPosts() : await readLocalPosts();
  return { posts, source } as const;
}

export async function readGardenNow(options: { live?: boolean } = {}) {
  const source = options.live && githubConfig() ? "github" : "local";
  const items = source === "github" ? await readGitHubNow() : await readLocalNow();
  return { items, source } as const;
}

async function writeGitHubFile(filePath: string, bytes: Buffer, message: string) {
  const config = githubConfig();
  if (!config) throw new Error("GitHub publishing is not configured.");
  const current = await readGitHubFile(filePath);
  const response = await fetch(githubContentsUrl(config.repository, filePath), {
    method: "PUT",
    headers: { ...githubHeaders(config.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: bytes.toString("base64"),
      branch: config.branch,
      ...(current?.sha ? { sha: current.sha } : {}),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 409) throw new Error("This note changed on GitHub. Reload it before saving again.");
    throw new Error(`GitHub could not publish this change (${response.status}).`);
  }
}

async function deleteGitHubFile(filePath: string, message: string) {
  const config = githubConfig();
  if (!config) throw new Error("GitHub publishing is not configured.");
  const current = await readGitHubFile(filePath);
  if (!current?.sha) return;
  const response = await fetch(githubContentsUrl(config.repository, filePath), {
    method: "DELETE",
    headers: { ...githubHeaders(config.token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha: current.sha, branch: config.branch }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub could not remove this note (${response.status}).`);
}

function postPath(id: string) {
  const safe = gardenPostSchema.shape.id.parse(id);
  return `${CONTENT_DIRECTORY}/${safe}.md`;
}

export async function writeGardenPost(input: GardenPost) {
  const post = gardenPostSchema.parse(input);
  const filePath = postPath(post.id);
  const contents = serializePostMarkdown(post);
  if (githubConfig()) {
    await writeGitHubFile(filePath, Buffer.from(contents), `${post.status === "Published" ? "Publish" : "Update"} ${post.title}`);
    return "github" as const;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub publishing is not configured.");
  await fs.mkdir(LOCAL_CONTENT_DIRECTORY, { recursive: true });
  await fs.writeFile(path.join(process.cwd(), filePath), contents, "utf8");
  return "local" as const;
}

export async function writeGardenPosts(posts: GardenPost[]) {
  for (const post of posts) await writeGardenPost(post);
  return githubConfig() ? "github" as const : "local" as const;
}

export async function writeGardenNow(input: GardenNowItem[]) {
  const items = gardenNowArraySchema.parse(input);
  const contents = `${JSON.stringify(items, null, 2)}\n`;
  if (githubConfig()) {
    await writeGitHubFile(NOW_FILE, Buffer.from(contents), "Update Now section");
    return "github" as const;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub publishing is not configured.");
  const destination = path.join(process.cwd(), NOW_FILE);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, contents, "utf8");
  return "local" as const;
}

export async function deleteGardenPost(id: string) {
  const filePath = postPath(id);
  if (githubConfig()) {
    await deleteGitHubFile(filePath, `Remove garden note ${id}`);
    return "github" as const;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub publishing is not configured.");
  await fs.rm(path.join(process.cwd(), filePath), { force: true });
  return "local" as const;
}

export async function writeGardenMedia(fileName: string, bytes: Buffer) {
  const relativePath = `public/uploads/${fileName}`;
  if (githubConfig()) {
    await writeGitHubFile(relativePath, bytes, `Add garden image ${fileName}`);
    return `/uploads/${fileName}`;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub media publishing is not configured.");
  const destination = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  return `/uploads/${fileName}`;
}

export function contentBackend() {
  return githubConfig() ? "github" : "local";
}
