"use client";

/* User-selected data images are intentionally rendered without optimization. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultGardenSettings, normalizeSettings, SETTINGS_EVENT, SETTINGS_KEY } from "../admin/settings";
import type { GardenPost, GardenSettings } from "../admin/types";
import { CONTENT_EVENT, loadGardenPosts } from "../lib/garden-content";
import { PageIntro } from "./page-intro";

export function GardenSection({ slug }: { slug: string }) {
  const fallbackTitle = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const [settings, setSettings] = useState<GardenSettings>(defaultGardenSettings);
  const [posts, setPosts] = useState<GardenPost[]>([]);

  useEffect(() => {
    const load = async () => {
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      try {
        if (storedSettings) setSettings(normalizeSettings(JSON.parse(storedSettings)));
      } catch {
        setSettings(defaultGardenSettings);
      }
      setPosts((await loadGardenPosts()) || []);
    };
    const refresh = () => void load();
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener(CONTENT_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener(CONTENT_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const category = settings.categories.find((item) => item.slug === slug);
  const title = category?.label || fallbackTitle;
  const visiblePosts = posts.filter((post) => post.status === "Published" && post.category === title);

  return (
    <PageIntro eyebrow={title} title={title} description={`Everything growing in ${title}.`}>
      {visiblePosts.length ? (
        <section className="category-list" aria-label={`${title} content`}>
          {visiblePosts.map((post) => (
            <article key={post.id}>
              <Link className="garden-section-link" href={`/${slug}/${post.slug}`}>
                {post.coverImage ? <img alt="" className="garden-section-cover" src={post.coverImage} /> : null}
                <p className="eyebrow">{post.tags.length ? post.tags.map((tag) => `#${tag}`).join(" ") : "From the garden"}</p>
                <h2>{post.title}</h2>
                {post.description ? <p className="intro">{post.description}</p> : null}
                <span className="garden-read-more">Open piece →</span>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state" aria-label={`${title} content`}>
          <p className="eyebrow">This part of the garden is ready for its first piece.</p>
        </section>
      )}
    </PageIntro>
  );
}
