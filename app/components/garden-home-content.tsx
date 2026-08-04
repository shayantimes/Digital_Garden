"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultGardenSettings, normalizeSettings, SETTINGS_EVENT, SETTINGS_KEY } from "../admin/settings";
import type { GardenPost, GardenSettings } from "../admin/types";
import { CONTENT_EVENT, loadGardenPosts } from "../lib/garden-content";

function displayDate(value: string) {
  if (!value) return "Recently added";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function GardenHomeContent() {
  const [posts, setPosts] = useState<GardenPost[]>([]);
  const [settings, setSettings] = useState<GardenSettings>(defaultGardenSettings);

  useEffect(() => {
    const load = async () => {
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      try {
        if (storedSettings) setSettings(normalizeSettings(JSON.parse(storedSettings)));
      } catch {
        setSettings(defaultGardenSettings);
      }
      const storedPosts = (await loadGardenPosts()) || [];
      setPosts(
        storedPosts
          .filter((post) => post.status === "Published")
          .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime()),
      );
    };
    const refresh = () => void load();
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(CONTENT_EVENT, refresh);
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(CONTENT_EVENT, refresh);
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!posts.length) {
    return (
      <section className="empty-state" aria-label="Latest content">
        <p className="eyebrow">Your published pieces will grow here.</p>
      </section>
    );
  }

  return (
    <section className="home-note-list" aria-label="Latest content">
      {posts.map((post) => {
        const category = settings.categories.find((item) => item.label === post.category);
        const sectionSlug = category?.slug || "notes";
        return (
          <Link className="home-note" href={`/${sectionSlug}/${post.slug}`} key={post.id}>
            <p className="date">{post.category} · {displayDate(post.publishedAt || post.updatedAt)}</p>
            <h2>{post.title}</h2>
            {post.description ? <p className="home-note-description">{post.description}</p> : null}
            {post.tags.length ? (
              <div className="tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            ) : null}
          </Link>
        );
      })}
    </section>
  );
}
