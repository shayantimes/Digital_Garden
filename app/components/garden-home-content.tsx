"use client";

/* Content-manager images may be browser-local data URLs or remote uploads. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gardenSettings } from "../lib/garden-config";
import { starterPosts } from "../lib/garden-data";
import type { GardenCategory, GardenPost } from "../lib/garden-types";
import styles from "./garden-home-content.module.css";
import { PlantIcon } from "./plant-icon";

type GardenSection = "build" | "lab" | "notes" | "shelf" | "life";

const fallbackItems: Record<GardenSection, string[]> = {
  build: ["Marketing Analytics Lab", "Pipochart Growth Engine", "Digital Garden v2"],
  lab: ["GA4 Dashboard Test", "Automtm KPI Tracker", "Content Experiment Log"],
  notes: ["The Gap Between Knowing and Doing", "On Building in Public", "Focus > Motivation"],
  shelf: ["Dune: Part Two", "Atomic Habits", "Nujabes — Modal Soul"],
  life: ["Morning Ride", "Futsal Match Day", "Hiking Under Stars"],
};

const sectionCopy: Record<GardenSection, { intro: string; icon: string; latest: string }> = {
  build: { intro: "Things I’m building or have built. Some shipped, some still cooking.", icon: "▰", latest: "RECENT PROJECTS" },
  lab: { intro: "Experiments, tests, random ideas, and things I’m learning.", icon: "⚗", latest: "LAST UPDATED" },
  notes: { intro: "Thoughts, reflections, and ideas that I don’t want to forget.", icon: "✎", latest: "LATEST NOTES" },
  shelf: { intro: "Books, movies, shows, music, and things that inspire me.", icon: "▣", latest: "RECENTLY ADDED" },
  life: { intro: "Moments from life. Biking, football, adventures, and everything in between.", icon: "⚲", latest: "LATEST ENTRIES" },
};

function displayDate(value?: string) {
  if (!value) return "May 20";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "May 20";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function SocialIcon({ name }: { name: "cv" | "github" | "linkedin" | "instagram" | "x" }) {
  if (name === "github") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.84a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>;
  if (name === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.1 7.1A2.1 2.1 0 1 0 5.1 3a2.1 2.1 0 0 0 0 4.1ZM3.3 21h3.6V9H3.3v12ZM9.2 9h3.4v1.6h.05c.47-.9 1.64-1.9 3.37-1.9 3.6 0 4.27 2.37 4.27 5.46V21h-3.57v-6.06c0-1.45-.03-3.3-2.02-3.3-2.02 0-2.33 1.57-2.33 3.2V21H9.2V9Z" /></svg>;
  if (name === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.7" r="1" className={styles.iconFill} /></svg>;
  if (name === "x") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.8 3H22l-7 8 8.2 10h-6.4l-5-6.2L6.3 21H3l7.3-8.4L2.4 3H9l4.5 5.6L18.8 3Zm-1.1 16h1.8L8 4.9H6.1L17.7 19Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h10l4 4V21H5V3.5Z" /><path d="M15 3.5V8h4M8 12h8M8 15h8M8 18h5" /></svg>;
}

function PaperPanel({
  section,
  category,
  posts,
}: {
  section: GardenSection;
  category: GardenCategory;
  posts: GardenPost[];
}) {
  const copy = sectionCopy[section];
  const items = posts.length ? posts.slice(0, 3).map((post) => post.title) : fallbackItems[section];
  return (
    <Link className={`${styles.paperPanel} ${styles[section]}`} href={`/${category.slug}`} aria-label={`Open ${category.label}`}>
      <span className={`${styles.tape} ${styles.panelTape}`} aria-hidden="true" />
      <header>
        <h2>{category.label.toUpperCase()}</h2>
      </header>
      <div className={styles.panelBody}>
        <div className={styles.panelIntro}>
          <span className={styles.panelIcon} aria-hidden="true">{category.iconImage ? <img src={category.iconImage} alt="" /> : copy.icon}</span>
          <p>{copy.intro}</p>
        </div>
        <span className={styles.marker}>{copy.latest}</span>
        <ul>
          {items.map((title, index) => (
            <li key={`${section}-${title}`}><span>{title}</span><time>{displayDate(posts[index]?.publishedAt || posts[index]?.updatedAt)}</time></li>
          ))}
        </ul>
      </div>
      <PlantIcon className={styles.panelCornerPlant} />
    </Link>
  );
}

export function GardenHomeContent() {
  const posts = useMemo(() => starterPosts
    .filter((post) => post.status === "Published")
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime()), []);
  const settings = gardenSettings;
  const [gardenScale, setGardenScale] = useState(1);
  const desktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktop = desktopRef.current;
    if (!desktop) return;
    const fitGarden = () => {
      const availableWidth = Math.max(280, window.innerWidth - 20);
      const availableHeight = Math.max(420, window.innerHeight - 20);
      setGardenScale(Math.min(1, availableWidth / desktop.offsetWidth, availableHeight / desktop.offsetHeight));
    };
    const observer = new ResizeObserver(fitGarden);
    observer.observe(desktop);
    window.addEventListener("resize", fitGarden);
    fitGarden();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitGarden);
    };
  }, [posts, settings]);

  const layoutCategories = useMemo(() => {
    const sections: GardenSection[] = ["build", "lab", "notes", "shelf", "life"];
    return Object.fromEntries(sections.map((section, index) => [
      section,
      settings.categories.find((category) => category.id === `category-${section}`)
        || settings.categories[index]
        || gardenSettings.categories[index],
    ])) as Record<GardenSection, GardenCategory>;
  }, [settings.categories]);

  const postsBySection = useMemo(() => {
    const result = {} as Record<GardenSection, GardenPost[]>;
    (["build", "lab", "notes", "shelf", "life"] as GardenSection[]).forEach((section) => {
      result[section] = posts.filter((post) => post.category === layoutCategories[section].label);
    });
    return result;
  }, [layoutCategories, posts]);

  const categoriesByLabel = useMemo(() => new Map(settings.categories.map((category) => [category.label, category])), [settings.categories]);

  return (
    <section className={styles.page} style={{ "--garden-scale": gardenScale } as CSSProperties} aria-labelledby="garden-title">
      <div className={styles.desktopWindow} ref={desktopRef}>
        <header className={styles.desktopBar}>
          <h1 id="garden-title">{settings.headerName.toUpperCase()}&apos;S GARDEN</h1>
          <nav className={styles.desktopMenu} aria-label="Garden sections">
            {settings.categories.map((category) => <Link href={`/${category.slug}`} key={category.id}>{category.label}</Link>)}
          </nav>
        </header>

        <div className={styles.desktopBody}>
          <aside className={styles.linksPanel}>
            <span className={`${styles.tape} ${styles.linkTape}`} aria-hidden="true" />
            <header><h2>LINKS</h2></header>
            <nav aria-label="Social links">
              <a href="#cv"><SocialIcon name="cv" /><span>CV</span></a>
              <a href="https://github.com" target="_blank" rel="noreferrer"><SocialIcon name="github" /><span>GitHub</span></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer"><SocialIcon name="linkedin" /><span>LinkedIn</span></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer"><SocialIcon name="instagram" /><span>Instagram</span></a>
              <a href="https://x.com" target="_blank" rel="noreferrer"><SocialIcon name="x" /><span>X</span></a>
            </nav>
            <PlantIcon className={styles.sprout} />
          </aside>

          <main className={styles.workspace}>
            <article className={styles.aboutWindow}>
              <span className={`${styles.tape} ${styles.aboutTape}`} aria-hidden="true" />
              <header><h2>ABOUT ME</h2></header>
              <div className={styles.aboutBody}>
                <div className={styles.aboutCopy}>
                  <h3>{settings.headerName.toUpperCase()}</h3>
                  <p className={styles.roles}>Marketer&nbsp; • &nbsp;Analyst&nbsp; • &nbsp;Builder</p>
                  <strong>Digital Gardener</strong>
                  <p className={styles.bio}>I explore, build, write,<br />and share things that shape<br />my mind and life.<br />This is my space to grow<br />in public.</p>
                  <ul className={styles.facts}>
                    <li><span>⌖</span>Based in Earth</li>
                    <li><span>◷</span>GMT+3:30</li>
                    <li><PlantIcon className={styles.factPlant} />Growing Daily</li>
                  </ul>
                </div>
                <figure className={styles.polaroid}>
                  <span className={`${styles.tape} ${styles.photoTape}`} aria-hidden="true" />
                  <div className={`${styles.portraitCrop}${settings.profileImage ? ` ${styles.managedPortrait}` : ""}`} role="img" aria-label={`Portrait of ${settings.headerName}`}>{settings.profileImage ? <img src={settings.profileImage} alt="" /> : null}</div>
                  <figcaption><b>Building a life</b><br />I don’t want to escape from.</figcaption>
                  <PlantIcon className={styles.photoSprout} />
                </figure>
              </div>
            </article>

            <div className={styles.cardGrid}>
              <PaperPanel section="lab" category={layoutCategories.lab} posts={postsBySection.lab} />
              <PaperPanel section="notes" category={layoutCategories.notes} posts={postsBySection.notes} />
              <blockquote className={styles.quote}><span className={`${styles.tape} ${styles.quoteTape}`} aria-hidden="true" />“A garden is never<br />finished.<br />It just keeps<br />growing.” <PlantIcon className={styles.quotePlant} /></blockquote>
              <PaperPanel section="build" category={layoutCategories.build} posts={postsBySection.build} />
              <PaperPanel section="life" category={layoutCategories.life} posts={postsBySection.life} />
              <PaperPanel section="shelf" category={layoutCategories.shelf} posts={postsBySection.shelf} />

              <section className={styles.recentPanel}>
                <span className={`${styles.tape} ${styles.recentTape}`} aria-hidden="true" />
                <h2>✦ RECENTLY PLANTED</h2>
                <ul>
                  {(posts.length ? posts.slice(0, settings.recentCount) : starterPosts.slice(0, settings.recentCount)).slice(0, 5).map((post, index) => {
                    const category = categoriesByLabel.get(post.category);
                    const slug = category?.slug || post.category.toLowerCase();
                    return <li key={post.id}><span>{category?.iconImage ? <img src={category.iconImage} alt="" /> : ["▧", "▰", "⚗", "⚲", "▣"][index]}</span><Link href={`/${slug}/${post.slug}`}>{post.category}: {post.title}</Link></li>;
                  })}
                </ul>
                <span className={styles.notebookHoles} aria-hidden="true">○<br />○<br />○<br />○<br />○</span>
                <PlantIcon className={styles.recentCornerPlant} />
              </section>

              <section className={styles.promise}><span className={`${styles.tape} ${styles.promiseTape}`} aria-hidden="true" /><img className={styles.wateringCan} src="/garden-icon.png" alt="" /><p>I’m not here to be perfect.<br />I’m here to be honest and<br />keep planting.</p><PlantIcon className={styles.promiseCornerPlant} /></section>
            </div>
          </main>

        </div>

        <footer className={styles.desktopFooter}>
          <div><PlantIcon className={styles.footerPlant} /><p><b>PLANTED BY {settings.headerName.toUpperCase()}</b><small>Keep planting. Keep growing.</small></p></div>
          <p>© 2026 {settings.headerName}&apos;s Garden<br />Built with curiosity</p>
        </footer>
      </div>
    </section>
  );
}
