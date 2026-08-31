import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { GardenPost } from "../admin/types";
import { gardenSettings } from "./garden-config";
import type { GardenAccount, GardenNowItem, GardenSettings } from "./garden-types";
import { gardenAccountSchema, gardenNowArraySchema, gardenPostSchema, gardenSettingsSchema } from "./content-schema";
import { starterNowItems } from "./garden-data";
import { parsePostMarkdown, serializePostMarkdown } from "./post-markdown";

const CONTENT_DIRECTORY = "content/posts";
const LOCAL_CONTENT_DIRECTORY = path.join(process.cwd(), CONTENT_DIRECTORY);
const NOW_FILE = "content/now.json";
const SETTINGS_FILE = "content/settings.json";
const ACCOUNT_FILE = "content/account.json";
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

function parseSettings(raw: string) {
  return gardenSettingsSchema.parse(JSON.parse(raw));
}

async function readGitHubSettings() {
  const file = await readGitHubFile(SETTINGS_FILE);
  if (!file?.content) return gardenSettings;
  return parseSettings(Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8"));
}

async function readLocalSettings() {
  try {
    return parseSettings(await fs.readFile(path.join(process.cwd(), SETTINGS_FILE), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return gardenSettings;
    throw error;
  }
}

function configuredAccount(): GardenAccount {
  return gardenAccountSchema.parse({
    username: process.env.GARDEN_ADMIN_USERNAME,
    email: process.env.GARDEN_ADMIN_EMAIL,
    userId: process.env.GARDEN_ADMIN_USER_ID || "",
  });
}

async function readGitHubAccount() {
  const file = await readGitHubFile(ACCOUNT_FILE);
  if (!file?.content) return configuredAccount();
  return gardenAccountSchema.parse(JSON.parse(Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8")));
}

async function readLocalAccount() {
  try {
    return gardenAccountSchema.parse(JSON.parse(await fs.readFile(path.join(process.cwd(), ACCOUNT_FILE), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return configuredAccount();
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

export async function readGardenSettings(options: { live?: boolean } = {}) {
  const source = options.live && githubConfig() ? "github" : "local";
  const settings = source === "github" ? await readGitHubSettings() : await readLocalSettings();
  return { settings, source } as const;
}

export async function readGardenAccount() {
  return githubConfig() ? readGitHubAccount() : readLocalAccount();
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

export async function writeGardenSettings(input: GardenSettings) {
  const settings = gardenSettingsSchema.parse(input);
  const contents = `${JSON.stringify(settings, null, 2)}\n`;
  if (githubConfig()) {
    await writeGitHubFile(SETTINGS_FILE, Buffer.from(contents), "Update garden settings");
    return "github" as const;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub publishing is not configured.");
  const destination = path.join(process.cwd(), SETTINGS_FILE);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, contents, "utf8");
  return "local" as const;
}

export async function writeGardenAccount(input: GardenAccount) {
  const account = gardenAccountSchema.parse(input);
  const contents = `${JSON.stringify(account, null, 2)}\n`;
  if (githubConfig()) {
    await writeGitHubFile(ACCOUNT_FILE, Buffer.from(contents), "Update garden account profile");
    return "github" as const;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub publishing is not configured.");
  const destination = path.join(process.cwd(), ACCOUNT_FILE);
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

export async function writeGardenFile(fileName: string, bytes: Buffer) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const relativePath = `public/uploads/${safeName}`;
  if (githubConfig()) {
    await writeGitHubFile(relativePath, bytes, `Add garden file ${safeName}`);
    return `/uploads/${safeName}`;
  }
  if (process.env.NODE_ENV === "production") throw new Error("GitHub file publishing is not configured.");
  const destination = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  return `/uploads/${safeName}`;
}

export async function readGardenBackupFiles() {
  const live = Boolean(githubConfig());
  const [postsResult, nowResult, settingsResult] = await Promise.all([
    readGardenPosts({ live }),
    readGardenNow({ live }),
    readGardenSettings({ live }),
  ]);
  const files = new Map<string, Buffer>();
  for (const post of postsResult.posts) files.set(`content/posts/${post.id}.md`, Buffer.from(serializePostMarkdown(post)));
  files.set(NOW_FILE, Buffer.from(`${JSON.stringify(nowResult.items, null, 2)}\n`));
  files.set(SETTINGS_FILE, Buffer.from(`${JSON.stringify(settingsResult.settings, null, 2)}\n`));

  if (live) {
    const uploads = await githubRequest<GitHubDirectoryItem[]>("public/uploads");
    if (Array.isArray(uploads)) {
      await Promise.all(uploads.filter((item) => item.type === "file").map(async (item) => {
        const file = await readGitHubFile(item.path);
        if (file?.content) files.set(item.path, Buffer.from(file.content.replace(/\n/g, ""), "base64"));
      }));
    }
  } else {
    const uploadsDirectory = path.join(process.cwd(), "public/uploads");
    const uploads = await fs.readdir(uploadsDirectory, { withFileTypes: true }).catch(() => []);
    await Promise.all(uploads.filter((item) => item.isFile()).map(async (item) => {
      files.set(`public/uploads/${item.name}`, await fs.readFile(path.join(uploadsDirectory, item.name)));
    }));
  }
  return Array.from(files, ([name, data]) => ({ name, data }));
}

export function contentBackend() {
  return githubConfig() ? "github" : "local";
}
