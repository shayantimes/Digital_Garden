"use client";

/* Uploaded posters are repository assets and intentionally bypass Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { GardenPost } from "../lib/garden-types";
import {
  normalizeShelfCategory,
  normalizeShelfStatus,
  shelfCategories,
  shelfStatusTone,
  type ShelfCategory,
} from "../lib/shelf";
import styles from "./shelf-library.module.css";

function safeExternalUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function linkLabel(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (host === "goodreads.com") return "Goodreads";
    if (host === "open.spotify.com" || host === "spotify.com") return "Spotify";
    if (host === "t.me" || host === "telegram.me") return "Telegram";
    if (host.endsWith("letterboxd.com")) return "Letterboxd";
    if (host.endsWith("youtube.com") || host === "youtu.be") return "YouTube";
    return host;
  } catch {
    return "External link";
  }
}

function ShelfCard({ item }: { item: GardenPost }) {
  const category = normalizeShelfCategory(item.shelfCategory);
  const status = normalizeShelfStatus(category, item.shelfStatus);
  const href = safeExternalUrl(item.externalUrl);

  const content = (
    <>
      <span className={styles.cardTopline}>
        <span>Shelf · {category}</span>
        {href ? <i aria-hidden="true">↗</i> : <i className={styles.noLink} aria-hidden="true">•</i>}
      </span>
      <span className={styles.cardBody}>
        <span className={styles.poster}>
          {item.coverImage ? <img alt={`${item.title} poster or cover`} src={item.coverImage} /> : <span className={styles.posterFallback}><small>{category.slice(0, -1) || category}</small><b>{item.title}</b></span>}
        </span>
        <span className={styles.cardCopy}>
          {category !== "Music" && status ? <span className={`${styles.status} ${styles[shelfStatusTone(status)]}`}>{status}</span> : null}
          <strong>{item.title}</strong>
          {item.description ? <span className={styles.creator}>{item.description}</span> : null}
          <span className={styles.destination}>{href ? <>Open on {linkLabel(href)} <i aria-hidden="true">↗</i></> : "Poster only"}</span>
        </span>
      </span>
    </>
  );

  if (href) {
    return <a className={styles.card} href={href} target="_blank" rel="noreferrer" aria-label={`Open ${item.title} on ${linkLabel(href)}`}>{content}</a>;
  }
  return <article className={`${styles.card} ${styles.cardStatic}`}>{content}</article>;
}

export function ShelfLibrary({ items }: { items: GardenPost[] }) {
  const [activeCategory, setActiveCategory] = useState<ShelfCategory>("Books");
  const counts = useMemo(() => Object.fromEntries(shelfCategories.map((category) => [
    category,
    items.filter((item) => normalizeShelfCategory(item.shelfCategory) === category).length,
  ])) as Record<ShelfCategory, number>, [items]);
  const visibleItems = useMemo(() => items.filter((item) => normalizeShelfCategory(item.shelfCategory) === activeCategory), [activeCategory, items]);

  return (
    <section className={styles.library} aria-labelledby="shelf-library-title">
      <header className={styles.libraryHeader}>
        <div>
          <p>Browse the collection</p>
          <h2 id="shelf-library-title">On the shelf</h2>
        </div>
        <span>{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</span>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Shelf categories">
        {shelfCategories.map((category) => (
          <button
            aria-controls="shelf-category-panel"
            aria-selected={activeCategory === category}
            className={activeCategory === category ? styles.tabActive : ""}
            key={category}
            onClick={() => setActiveCategory(category)}
            role="tab"
            type="button"
          >
            <span>{category}</span><b>{String(counts[category]).padStart(2, "0")}</b>
          </button>
        ))}
      </div>

      <div id="shelf-category-panel" role="tabpanel" aria-live="polite">
        {visibleItems.length ? (
          <div className={styles.grid}>{visibleItems.map((item) => <ShelfCard item={item} key={item.id} />)}</div>
        ) : (
          <div className={styles.empty}>
            <span aria-hidden="true">{activeCategory === "Music" ? "♫" : "⌑"}</span>
            <h3>No {activeCategory.toLowerCase()} here yet.</h3>
            <p>This part of the shelf is ready for its first addition.</p>
          </div>
        )}
      </div>
    </section>
  );
}
