/* Static category images may be local or remote assets. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { isGardenCategory, normalizeGardenCategory } from "../lib/garden-categories";
import { gardenSettings } from "../lib/garden-config";
import { starterPosts } from "../lib/garden-data";
import { readGardenPosts } from "../lib/server-content";

const sectionCopy: Record<string, { eyebrow: string; description: string; symbol: string }> = {
  build: { eyebrow: "Made with hands & pixels", description: "Projects that escaped the notebook and became real things.", symbol: "↗" },
  notes: { eyebrow: "Thoughts and experiments, kept safely", description: "Essays, experiments, observations, systems, and fragments I want to return to.", symbol: "✎" },
  shelf: { eyebrow: "Things that feed the garden", description: "Books, films, shows, music, and ideas worth passing along.", symbol: "⌑" },
  life: { eyebrow: "Away from the screen", description: "Biking, football, places, routines, and moments from an ordinary life.", symbol: "☼" },
};

function displayDate(value: string) {
  if (!value) return "Recently planted";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export async function GardenSection({ slug }: { slug: string }) {
  const fallbackTitle = slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  const settings = gardenSettings;

  const category = settings.categories.find((item) => item.slug === slug);
  const title = category?.label || fallbackTitle;
  const categoryDesign = category?.id.replace(/^category-/, "") || slug;
  const design = sectionCopy[categoryDesign] ? categoryDesign : slug;
  const copy = sectionCopy[design] || { eyebrow: "A corner of the garden", description: `Everything growing in ${title}.`, symbol: "↗" };
  const managedPosts = await readGardenPosts({ live: false }).then((result) => result.posts).catch(() => starterPosts);
  const visiblePosts = managedPosts
      .filter((post) => post.status === "Published" && isGardenCategory(post.category, title))
      .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());

  return (
    <main className={`section-page theme-${design}`}>
      <section className="section-hero">
        <div className="section-hero-copy">
          <p className="section-eyebrow"><span>{String(visiblePosts.length).padStart(2, "0")}</span>{copy.eyebrow}</p>
          <h1>{title}<i aria-hidden="true">{copy.symbol}</i></h1>
          <p>{copy.description}</p>
        </div>
        <div className="section-doodle" aria-hidden="true">{category?.iconImage ? <img src={category.iconImage} alt="" /> : <span>{copy.symbol}</span>}<i /></div>
      </section>

      {visiblePosts.length ? (
        <section className="section-collection" aria-label={`${title} content`}>
          <header><p>Latest growth</p><span>{visiblePosts.length} {visiblePosts.length === 1 ? "piece" : "pieces"} in this plot</span></header>
          <div className="section-card-grid">
            {visiblePosts.map((post, index) => (
              <article className={`content-card content-card-${(index % 4) + 1}`} key={post.id}>
                <Link href={`/${slug}/${post.slug}`}>
                  <span className="content-card-visual">
                    {post.coverImage ? <img alt="" src={post.coverImage} /> : <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>}
                    <small>{normalizeGardenCategory(post.category)}</small>
                  </span>
                  <span className="content-card-copy">
                    <span className="content-meta">{displayDate(post.publishedAt || post.updatedAt)}</span>
                    <strong>{post.title}</strong>
                    {post.description ? <span>{post.description}</span> : null}
                    <b>Read piece <i aria-hidden="true">↗</i></b>
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="section-empty" aria-label={`${title} content`}>
          <span aria-hidden="true">{category?.iconImage ? <img src={category.iconImage} alt="" /> : copy.symbol}</span>
          <h2>This plot is ready.</h2>
          <p>The first {title.toLowerCase()} piece is still taking root.</p>
        </section>
      )}
    </main>
  );
}
