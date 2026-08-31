/* Static post images are intentionally rendered without optimization. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { type ReactNode } from "react";
import { isGardenCategory, normalizeGardenCategory } from "../lib/garden-categories";
import { gardenSettings } from "../lib/garden-config";
import { starterPosts } from "../lib/garden-data";
import { readGardenPosts, readGardenSettings } from "../lib/server-content";

function safeLink(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

function safeMedia(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    return new URL(value).protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function inlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a href={safeLink(link[2])} key={index} rel="noreferrer" target="_blank">{link[1]}</a>;
    return token;
  });
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="garden-markdown">
      {content.split("\n").map((line, index) => {
        const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (image) {
          const source = safeMedia(image[2]);
          return source ? <img alt={image[1]} className="garden-inline-image" key={index} src={source} /> : null;
        }
        if (line.startsWith("### ")) return <h3 key={index}>{inlineMarkdown(line.slice(4))}</h3>;
        if (line.startsWith("## ")) return <h2 key={index}>{inlineMarkdown(line.slice(3))}</h2>;
        if (line.startsWith("# ")) return <h2 key={index}>{inlineMarkdown(line.slice(2))}</h2>;
        if (line.startsWith("> ")) return <blockquote key={index}>{inlineMarkdown(line.slice(2))}</blockquote>;
        if (line.startsWith("- ")) return <li key={index}>{inlineMarkdown(line.slice(2))}</li>;
        if (!line.trim()) return <span className="garden-line-break" key={index} />;
        return <p key={index}>{inlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function videoEmbed(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${parsed.pathname.split("/").filter(Boolean).at(-1)}`;
  } catch {
    return "";
  }
  return "";
}

function displayDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export async function GardenPostView({ sectionSlug, postSlug }: { sectionSlug: string; postSlug: string }) {
  const settings = await readGardenSettings({ live: false }).then((result) => result.settings).catch(() => gardenSettings);
  const category = settings.categories.find((item) => item.slug === sectionSlug);
  const canonicalCategory = category?.id ? canonicalCategoryName(category.id) : "";
  const managedPosts = await readGardenPosts({ live: false }).then((result) => result.posts).catch(() => starterPosts);
  const post = managedPosts.find((item) => item.status === "Published" && item.slug === postSlug && (!category || isGardenCategory(item.category, canonicalCategory))) || null;
  if (post === null) {
    return (
      <main className={`garden-post-page garden-post-missing theme-${sectionSlug}`}>
        <p className="eyebrow">Not found</p>
        <h1>This piece isn’t published.</h1>
        <Link className="text-link" href={`/${sectionSlug}`}>Back to {category?.label || "the garden"} →</Link>
      </main>
    );
  }

  const embedUrl = post.videoUrl ? videoEmbed(post.videoUrl) : "";
  const postCategory = normalizeGardenCategory(post.category);
  return (
    <main className={`garden-post-page theme-${sectionSlug}`}>
      <article>
        <Link className="post-back-link" href={`/${sectionSlug}`}>← Back to {category?.label || postCategory}</Link>
        <header className="garden-post-hero">
          <p className="eyebrow">{postCategory} · {displayDate(post.publishedAt || post.updatedAt)}</p>
          <h1>{post.title}</h1>
          {post.description ? <p className="garden-post-description">{post.description}</p> : null}
          {post.tags.length ? <div className="tags garden-post-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        </header>

        {post.coverImage ? <img alt={post.title} className="garden-post-cover" src={post.coverImage} /> : null}

        {post.videoUrl ? (
          embedUrl ? (
            <div className="garden-video"><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen src={embedUrl} title={`${post.title} video`} /></div>
          ) : (
            <video className="garden-direct-video" controls src={post.videoUrl}>Your browser cannot play this video.</video>
          )
        ) : null}

        {post.externalUrl ? <a className="garden-link-card" href={safeLink(post.externalUrl)} rel="noreferrer" target="_blank">Visit featured link <span>↗</span></a> : null}
        {post.content ? <MarkdownContent content={post.content} /> : null}

        {post.gallery?.length ? (
          <section className="garden-post-gallery" aria-label="Photo gallery">
            {post.gallery.map((image, index) => <img alt={`${post.title}, photo ${index + 1}`} key={`${image.slice(0, 40)}-${index}`} src={image} />)}
          </section>
        ) : null}

        <footer className="garden-post-footer">
          <span>Keep wandering through the garden.</span>
          <Link href={`/${sectionSlug}`}>← Back to {category?.label || postCategory}</Link>
        </footer>
      </article>
    </main>
  );
}

function canonicalCategoryName(categoryId: string) {
  const value = categoryId.replace(/^category-/, "");
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
