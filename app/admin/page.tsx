"use client";

/* Uploaded images are repository assets and intentionally bypass Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "./icons";
import { defaultGardenSettings } from "./settings";
import type { GardenPost, PostStatus } from "./types";
import {
  fetchGardenNow,
  fetchGardenPosts,
  fetchGardenSettings,
  importGardenPosts,
  loadLegacyGardenPosts,
  removeGardenPost,
  saveGardenNow,
  saveGardenPost,
  saveGardenSettings,
  uploadGardenCv,
  uploadGardenImage,
} from "../lib/garden-content";
import type { GardenNowItem, GardenSettings } from "../lib/garden-types";
import { materializeLegacyPostImages } from "../lib/legacy-content-migration";
import {
  buildNowDestinationOptions,
  type NowDestinationGroup,
  type NowDestinationOption,
} from "../lib/now-destinations";
import { normalizeShelfCategory, normalizeShelfStatus, shelfCategories, shelfStatuses } from "../lib/shelf";
import styles from "./admin.module.css";

type SaveState = "quiet" | "saving" | "saved" | "error";
type StudioView = "library" | "drafts" | "settings";

const LOCAL_DRAFT_PREFIX = "garden-studio-draft:";
const categories = defaultGardenSettings.categories.map((category) => category.label);

function canonicalCategory(categoryId: string) {
  const name = categoryId.replace(/^category-/, "");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function emptyPost(seed = "", category = "Notes"): GardenPost {
  const now = new Date().toISOString();
  const lines = seed.trim().split("\n");
  const firstLine = lines[0]?.replace(/^#+\s*/, "").trim() || "";
  const title = firstLine.length <= 90 ? firstLine : "";
  const content = title ? lines.slice(1).join("\n").trim() : seed.trim();
  return {
    id: `post-${Date.now()}`,
    title,
    description: "",
    content,
    status: "Draft",
    type: "Content",
    category,
    tags: [],
    slug: slugify(title),
    coverImage: "",
    gallery: [],
    videoUrl: "",
    externalUrl: "",
    shelfCategory: "Books",
    shelfStatus: "To Read",
    seoTitle: title,
    seoDescription: "",
    updatedAt: now,
    publishedAt: "",
    likes: 0,
    bookmarks: 0,
    comments: 0,
    versions: [],
  };
}

function emptyNowItem(): GardenNowItem {
  return {
    id: `now-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: "Working on",
    title: "",
    url: "",
  };
}

function relativeDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)} hr ago`;
  if (minutes < 10_080) return `${Math.floor(minutes / 1_440)} days ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

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
  const tokens = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("_") && token.endsWith("_")) return <em key={index}>{token.slice(1, -1)}</em>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a href={safeLink(link[2])} key={index} rel="noreferrer" target="_blank">{link[1]}</a>;
    return token;
  });
}

function MarkdownPreview({ content, emptyMessage = "Your words will appear here." }: { content: string; emptyMessage?: string }) {
  if (!content.trim()) return <p className={styles.previewEmpty}>{emptyMessage}</p>;
  return (
    <div className={styles.markdownPreview}>
      {content.split("\n").map((line, index) => {
        const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (image) {
          const source = safeMedia(image[2]);
          return source ? <img alt={image[1]} key={index} src={source} /> : null;
        }
        if (line.startsWith("### ")) return <h3 key={index}>{inlineMarkdown(line.slice(4))}</h3>;
        if (line.startsWith("## ")) return <h2 key={index}>{inlineMarkdown(line.slice(3))}</h2>;
        if (line.startsWith("# ")) return <h2 key={index}>{inlineMarkdown(line.slice(2))}</h2>;
        if (line.startsWith("> ")) return <blockquote key={index}>{inlineMarkdown(line.slice(2))}</blockquote>;
        if (line.startsWith("- ")) return <li key={index}>{inlineMarkdown(line.slice(2))}</li>;
        if (!line.trim()) return <span className={styles.lineBreak} key={index} />;
        return <p key={index}>{inlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export default function AdminPage() {
  const [auth, setAuth] = useState<"checking" | "locked" | "ready">("checking");
  const [posts, setPosts] = useState<GardenPost[]>([]);
  const [nowItems, setNowItems] = useState<GardenNowItem[]>([]);
  const [gardenPreferences, setGardenPreferences] = useState<GardenSettings>(defaultGardenSettings);
  const [backend, setBackend] = useState<"github" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<StudioView>("library");
  const [section, setSection] = useState("All");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<GardenPost | null>(null);
  const [legacyPosts, setLegacyPosts] = useState<GardenPost[]>([]);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [toast, setToast] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  const profileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [postsResult, nowResult, settingsResult] = await Promise.allSettled([fetchGardenPosts(), fetchGardenNow(), fetchGardenSettings()]);
      const issues: string[] = [];
      if (postsResult.status === "fulfilled") {
        setPosts(postsResult.value.posts);
        setBackend(postsResult.value.backend);
        const legacy = await loadLegacyGardenPosts();
        const candidates = legacy.filter((oldPost) => {
          const current = postsResult.value.posts.find((post) => post.id === oldPost.id);
          return !current || new Date(oldPost.updatedAt).getTime() > new Date(current.updatedAt).getTime();
        });
        setLegacyPosts(candidates);
      } else {
        issues.push(postsResult.reason instanceof Error ? postsResult.reason.message : "The garden notes could not be opened.");
      }
      if (nowResult.status === "fulfilled") {
        setNowItems(nowResult.value.items);
        setBackend(nowResult.value.backend);
      } else {
        issues.push(nowResult.reason instanceof Error ? nowResult.reason.message : "The Now section could not be opened.");
      }
      if (settingsResult.status === "fulfilled") {
        setGardenPreferences(settingsResult.value.settings);
        setBackend(settingsResult.value.backend);
      } else {
        issues.push(settingsResult.reason instanceof Error ? settingsResult.reason.message : "Homepage settings could not be opened.");
      }
      setError(issues.join(" "));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The garden could not be opened.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetch("/api/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => {
        const next = result.authenticated ? "ready" : "locked";
        setAuth(next);
        if (next === "ready") void load();
      })
      .catch(() => setAuth("locked"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visiblePosts = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return posts
      .filter((post) => view !== "drafts" || post.status !== "Published")
      .filter((post) => section === "All" || post.category === section)
      .filter((post) => !needle || [post.title, post.description, post.content, post.tags.join(" ")].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [posts, query, section, view]);

  const importMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const imported = await Promise.all(files.map(async (file) => {
      const text = await file.text();
      const titleMatch = text.match(/^#\s+(.+)$/m);
      const note = emptyPost();
      const title = titleMatch?.[1]?.trim() || file.name.replace(/\.(md|mdx|txt)$/i, "");
      return { ...note, id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, slug: slugify(title), seoTitle: title, content: titleMatch ? text.replace(titleMatch[0], "").trim() : text.trim() };
    }));
    try {
      await importGardenPosts(imported);
      setPosts((current) => [...imported, ...current.filter((post) => !imported.some((item) => item.id === post.id))]);
      setToast(`${imported.length} ${imported.length === 1 ? "note" : "notes"} imported`);
      setEditor(imported[0]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Those notes could not be imported.");
    } finally {
      event.target.value = "";
    }
  };

  const importLegacy = async () => {
    setImportingLegacy(true);
    setError("");
    try {
      const imported = await materializeLegacyPostImages(legacyPosts, uploadGardenImage);
      await importGardenPosts(imported);
      const byId = new Map(posts.map((post) => [post.id, post]));
      imported.forEach((post) => byId.set(post.id, post));
      setPosts(Array.from(byId.values()));
      setToast(`${legacyPosts.length} old ${legacyPosts.length === 1 ? "note" : "notes"} brought into the new studio`);
      setLegacyPosts([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The old notes could not be imported.");
    } finally {
      setImportingLegacy(false);
    }
  };

  const exportBackup = () => {
    const anchor = document.createElement("a");
    anchor.href = "/api/backup";
    anchor.download = "";
    anchor.click();
    setToast("Preparing your complete ZIP backup");
  };

  const uploadProfile = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      const profileImage = await uploadGardenImage(file);
      const next = { ...gardenPreferences, profileImage };
      await saveGardenSettings(next);
      setGardenPreferences(next);
      setToast("Profile photo updated everywhere");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The profile photo could not be updated.");
    }
  };

  if (auth === "checking") return <StudioLoading label="Opening your garden…" />;
  if (auth === "locked") return <StudioLogin />;

  if (editor) {
    return (
      <PostEditor
        backend={backend}
        initialPost={editor}
        onBack={() => setEditor(null)}
        onSaved={(saved) => {
          setPosts((current) => current.some((post) => post.id === saved.id)
            ? current.map((post) => post.id === saved.id ? saved : post)
            : [saved, ...current]);
          setEditor(saved);
        }}
        onDelete={async (id) => {
          await removeGardenPost(id);
          setPosts((current) => current.filter((post) => post.id !== id));
          setToast("Note removed from the garden");
          setEditor(null);
        }}
      />
    );
  }

  return (
    <main className={styles.studio}>
      <aside className={styles.rail}>
        <div className={styles.brand}>
          <button className={styles.brandAvatar} aria-label="Change profile photo" onClick={() => profileInput.current?.click()}>
            {gardenPreferences.profileImage ? <img src={gardenPreferences.profileImage} alt="" /> : <span>✦</span>}
            <i><Icon name="upload" /></i>
          </button>
          <div><strong>Shayan</strong><small>Garden Studio</small></div>
        </div>

        <nav className={styles.libraryNav} aria-label="Studio navigation">
          <button className={view === "library" ? styles.navActive : ""} onClick={() => { setView("library"); setSection("All"); }}>
            <span><Icon name="folder" /> Library</span><b>{posts.length}</b>
          </button>
          <button className={view === "drafts" ? styles.navActive : ""} onClick={() => { setView("drafts"); setSection("All"); }}>
            <span><Icon name="edit" /> Drafts</span><b>{posts.filter((post) => post.status !== "Published").length}</b>
          </button>
          <button className={view === "settings" ? styles.navActive : ""} onClick={() => setView("settings")}>
            <span><Icon name="settings" /> Settings</span><b>2</b>
          </button>
        </nav>

        <div className={styles.railFooter}>
          <button onClick={exportBackup}><Icon name="archive" /> Download backup</button>
          <Link href="/" target="_blank"><Icon name="eye" /> Open garden</Link>
          <form action="/api/auth/logout" method="post" className={styles.logoutForm}><button type="submit"><Icon name="x" /> Sign out</button></form>
          <span className={styles.storageNote}><i className={backend === "github" ? styles.liveDot : ""} />{backend === "github" ? "Publishing to GitHub" : "Saving to this project"}</span>
        </div>
        <input ref={importInput} hidden multiple accept=".md,.mdx,.txt,text/markdown,text/plain" type="file" onChange={importMarkdown} />
        <input ref={profileInput} hidden accept="image/*" type="file" onChange={(event) => void uploadProfile(event.target.files?.[0])} />
      </aside>

      <section className={styles.library}>
        {view === "settings" ? (
          <SettingsManager
            backend={backend}
            initialSettings={gardenPreferences}
            initialNowItems={nowItems}
            key={loading ? "settings-loading" : JSON.stringify(gardenPreferences)}
            loading={loading}
            loadError={error}
            onRetry={() => void load()}
            onSettingsSaved={(settings) => { setGardenPreferences(settings); setToast("Homepage settings updated"); }}
            onNowSaved={(items) => { setNowItems(items); setToast("Now section updated"); }}
            posts={posts}
          />
        ) : <>
        <header className={styles.libraryHeader}>
          <div><p>{view === "drafts" ? "Private workspace" : "Content library"}</p><h1>{view === "drafts" ? "Drafts, ready when you are" : "Everything in one place"}</h1><span>{view === "drafts" ? "Filter unfinished work by section, then continue exactly where you stopped." : "Choose a section, add the right kind of content, and publish when it feels ready."}</span></div>
          <div className={styles.libraryHeaderTools}>
            <label className={styles.search}><Icon name="search" /><input aria-label="Search content" placeholder="Search content…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <button className={styles.importButton} onClick={() => importInput.current?.click()}><Icon name="upload" /> Import</button>
            <button className={styles.newContentButton} onClick={() => setEditor(emptyPost("", section === "All" ? "Notes" : section))}><Icon name="plus" /> Add {section === "All" ? "content" : section.toLowerCase()}</button>
          </div>
        </header>

        <nav className={styles.sectionChips} aria-label="Filter by garden section">
          <button className={section === "All" ? styles.sectionChipActive : ""} onClick={() => setSection("All")}><span>✦</span> All sections</button>
          {gardenPreferences.categories.map((category) => {
            const value = canonicalCategory(category.id);
            return <button className={section === value ? styles.sectionChipActive : ""} key={category.id} onClick={() => setSection(value)}>{category.iconImage ? <img src={category.iconImage} alt="" /> : <span>{value === "Build" ? "▰" : value === "Notes" ? "✎" : value === "Shelf" ? "▣" : "⚲"}</span>}{category.label}<b>{posts.filter((post) => post.category === value && (view !== "drafts" || post.status !== "Published")).length}</b></button>;
          })}
        </nav>

        {legacyPosts.length ? (
          <div className={styles.migrationBanner}>
            <span><Icon name="sparkles" /></span>
            <div><strong>Your old studio left {legacyPosts.length} {legacyPosts.length === 1 ? "note" : "notes"} in this browser.</strong><p>Bring them into the new Git-backed library before removing the old system.</p></div>
            <button aria-busy={importingLegacy} disabled={importingLegacy} onClick={() => void importLegacy()}>{importingLegacy ? "Bringing them in…" : "Bring them in"}</button>
          </div>
        ) : null}

        {error ? <div className={styles.errorBanner}><span>{error}</span><button onClick={() => { setError(""); void load(); }}>Try again</button></div> : null}

        <div className={styles.listHeading}><span>{loading ? "Opening…" : `${visiblePosts.length} ${visiblePosts.length === 1 ? "item" : "items"}`}</span><span>Last changed</span></div>
        <div className={styles.noteList}>
          {visiblePosts.map((post) => (
            <button className={styles.noteRow} key={post.id} onClick={() => setEditor(post)}>
              <span className={styles.noteGlyph}>{post.coverImage ? <img src={post.coverImage} alt="" /> : post.title.slice(0, 1).toUpperCase() || "·"}</span>
              <span className={styles.noteCopy}><strong>{post.title || "Untitled item"}</strong><small>{post.description || post.content.replace(/[#>*_`\n]/g, " ").trim() || "Ready for your next thought."}</small><em>{post.category === "Shelf" ? `${normalizeShelfCategory(post.shelfCategory)}${post.shelfStatus ? ` · ${post.shelfStatus}` : ""}` : post.tags.slice(0, 3).map((tag) => `#${tag}`).join("  ")}</em></span>
              <span className={styles.notePath}>{post.category}</span>
              <span className={`${styles.noteStatus} ${post.status === "Published" ? styles.isPublished : ""}`}><i />{post.status === "Published" ? "Published" : "Growing"}</span>
              <span className={styles.noteDate}>{relativeDate(post.updatedAt)}</span>
              <span className={styles.noteArrow}>↗</span>
            </button>
          ))}
          {!loading && !visiblePosts.length ? <div className={styles.emptyLibrary}><span>✦</span><h2>{view === "drafts" ? "No drafts in this section." : "Nothing here yet."}</h2><p>{view === "drafts" ? "Anything you save to Drafts will wait here." : "Choose a section above and add your first item."}</p></div> : null}
        </div>
        </>}
      </section>
      {toast ? <div className={styles.toast}><Icon name="check" />{toast}</div> : null}
    </main>
  );
}

function SettingsManager({
  backend,
  initialSettings,
  initialNowItems,
  loading,
  loadError,
  onRetry,
  onSettingsSaved,
  onNowSaved,
  posts,
}: {
  backend: "github" | "local";
  initialSettings: GardenSettings;
  initialNowItems: GardenNowItem[];
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  onSettingsSaved: (settings: GardenSettings) => void;
  onNowSaved: (items: GardenNowItem[]) => void;
  posts: GardenPost[];
}) {
  const [tab, setTab] = useState<"home" | "account">("home");
  const [settings, setSettings] = useState(initialSettings);
  const [saveState, setSaveState] = useState<SaveState>("quiet");
  const [settingsError, setSettingsError] = useState("");
  const [uploading, setUploading] = useState("");
  const profileInput = useRef<HTMLInputElement>(null);
  const cvInput = useRef<HTMLInputElement>(null);

  const setSetting = <K extends keyof GardenSettings>(field: K, value: GardenSettings[K]) => {
    setSaveState("quiet");
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const saveHome = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState("saving");
    setSettingsError("");
    try {
      await saveGardenSettings(settings);
      onSettingsSaved(settings);
      setSaveState("saved");
    } catch (caught) {
      setSaveState("error");
      setSettingsError(caught instanceof Error ? caught.message : "Homepage settings could not be saved.");
    }
  };

  const uploadSettingImage = async (file: File | undefined, kind: "profile" | number) => {
    if (!file) return;
    setUploading(kind === "profile" ? "profile" : `icon-${kind}`);
    setSettingsError("");
    try {
      const url = await uploadGardenImage(file);
      if (kind === "profile") setSetting("profileImage", url);
      else setSetting("categories", settings.categories.map((category, index) => index === kind ? { ...category, iconImage: url } : category));
    } catch (caught) {
      setSettingsError(caught instanceof Error ? caught.message : "That image could not be uploaded.");
    } finally {
      setUploading("");
    }
  };

  const uploadCv = async (file?: File) => {
    if (!file) return;
    setUploading("cv");
    setSettingsError("");
    try { setSetting("cvUrl", await uploadGardenCv(file)); }
    catch (caught) { setSettingsError(caught instanceof Error ? caught.message : "The CV could not be uploaded."); }
    finally { setUploading(""); }
  };

  return (
    <div className={styles.settingsManager}>
      <header className={styles.settingsHeader}>
        <div><p>Garden controls</p><h1>Settings</h1><span>Shape the homepage and keep your private account details current.</span></div>
        <nav aria-label="Settings sections">
          <button className={tab === "home" ? styles.settingsTabActive : ""} onClick={() => setTab("home")}><Icon name="layout" /> Home Page</button>
          <button className={tab === "account" ? styles.settingsTabActive : ""} onClick={() => setTab("account")}><Icon name="settings" /> Account</button>
        </nav>
      </header>

      {loadError ? <div className={styles.errorBanner}><span>{loadError}</span><button onClick={onRetry}>Try again</button></div> : null}

      {tab === "home" ? (
        <>
          <form className={styles.settingsForm} onSubmit={saveHome}>
            <section className={styles.settingsCard}>
              <div className={styles.settingsCardIntro}><span>01</span><div><h2>Identity & field notes</h2><p>Control the profile copy, photo caption, field note, and promise shown on your homepage.</p></div></div>
              <div className={styles.profileSetting}>
                <button type="button" onClick={() => profileInput.current?.click()}>{settings.profileImage ? <img src={settings.profileImage} alt="" /> : <span>✦</span>}<i><Icon name="upload" /></i></button>
                <div><strong>Homepage portrait</strong><small>{uploading === "profile" ? "Uploading…" : "Click the portrait to replace it everywhere."}</small></div>
                <input hidden ref={profileInput} accept="image/*" type="file" onChange={(event) => void uploadSettingImage(event.target.files?.[0], "profile")} />
              </div>
              <div className={styles.settingsFields}>
                <label><span>Display name</span><input maxLength={80} value={settings.headerName} onChange={(event) => setSetting("headerName", event.target.value)} /></label>
                <label><span>Roles line</span><input maxLength={180} placeholder="Marketer • Analyst • Builder" value={settings.profileRoles} onChange={(event) => setSetting("profileRoles", event.target.value)} /></label>
                <label><span>Profile title</span><input maxLength={100} placeholder="Digital Gardener" value={settings.profileTitle} onChange={(event) => setSetting("profileTitle", event.target.value)} /></label>
                <label><span>Recent items per section</span><input min={1} max={30} type="number" value={settings.recentCount} onChange={(event) => setSetting("recentCount", Number(event.target.value))} /></label>
                <label className={styles.fullSetting}><span>Field notes / About copy</span><textarea maxLength={1200} rows={5} value={settings.fieldNotes} onChange={(event) => setSetting("fieldNotes", event.target.value)} /></label>
                <label className={styles.fullSetting}><span>Photo caption</span><textarea maxLength={280} rows={2} value={settings.photoCaption} onChange={(event) => setSetting("photoCaption", event.target.value)} /><small>The first line is shown in bold. Press Enter to control the next line.</small></label>
                <label className={styles.fullSetting}><span>Field note card</span><textarea maxLength={400} rows={4} value={settings.fieldNoteQuote} onChange={(event) => setSetting("fieldNoteQuote", event.target.value)} /><small>Quotation marks are added automatically. Line breaks are kept on the homepage.</small></label>
                <label className={styles.fullSetting}><span>Promise card</span><textarea maxLength={400} rows={3} value={settings.gardenPromise} onChange={(event) => setSetting("gardenPromise", event.target.value)} /><small>Line breaks are kept beside the watering can.</small></label>
              </div>
            </section>

            <section className={styles.settingsCard}>
              <div className={styles.settingsCardIntro}><span>02</span><div><h2>Garden sections</h2><p>Rename the four homepage sections and give each one its own icon.</p></div></div>
              <div className={styles.categorySettings}>
                {settings.categories.map((category, index) => (
                  <article key={category.id}>
                    <button type="button" onClick={(event) => (event.currentTarget.nextElementSibling as HTMLInputElement | null)?.click()}>{category.iconImage ? <img src={category.iconImage} alt="" /> : <span>{canonicalCategory(category.id) === "Build" ? "▰" : canonicalCategory(category.id) === "Notes" ? "✎" : canonicalCategory(category.id) === "Shelf" ? "▣" : "⚲"}</span>}<i><Icon name="upload" /></i></button>
                    <input hidden accept="image/*" type="file" onChange={(event) => void uploadSettingImage(event.target.files?.[0], index)} />
                    <label><span>{canonicalCategory(category.id)} label</span><input maxLength={40} value={category.label} onChange={(event) => setSetting("categories", settings.categories.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /></label>
                    <small>{uploading === `icon-${index}` ? "Uploading icon…" : `/${category.slug}`}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.settingsCard}>
              <div className={styles.settingsCardIntro}><span>03</span><div><h2>Links & CV</h2><p>Only links with a value appear in the homepage links panel.</p></div></div>
              <div className={styles.settingsFields}>
                <label><span>Email</span><input type="email" placeholder="you@example.com" value={settings.socialLinks.email} onChange={(event) => setSetting("socialLinks", { ...settings.socialLinks, email: event.target.value })} /></label>
                <label><span>Instagram</span><input type="url" placeholder="https://instagram.com/…" value={settings.socialLinks.instagram} onChange={(event) => setSetting("socialLinks", { ...settings.socialLinks, instagram: event.target.value })} /></label>
                <label><span>LinkedIn</span><input type="url" placeholder="https://linkedin.com/in/…" value={settings.socialLinks.linkedin} onChange={(event) => setSetting("socialLinks", { ...settings.socialLinks, linkedin: event.target.value })} /></label>
                <label><span>GitHub</span><input type="url" placeholder="https://github.com/…" value={settings.socialLinks.github} onChange={(event) => setSetting("socialLinks", { ...settings.socialLinks, github: event.target.value })} /></label>
                <label><span>X</span><input type="url" placeholder="https://x.com/…" value={settings.socialLinks.x} onChange={(event) => setSetting("socialLinks", { ...settings.socialLinks, x: event.target.value })} /></label>
                <div className={styles.cvSetting}><span>CV file</span><button type="button" onClick={() => cvInput.current?.click()}><Icon name="file" />{uploading === "cv" ? "Uploading…" : settings.cvUrl ? "Replace CV PDF" : "Upload CV PDF"}</button>{settings.cvUrl ? <a href={settings.cvUrl} target="_blank" rel="noreferrer">View current CV ↗</a> : <small>PDF · 10 MB max</small>}<input hidden ref={cvInput} accept="application/pdf,.pdf" type="file" onChange={(event) => void uploadCv(event.target.files?.[0])} /></div>
              </div>
            </section>

            {settingsError ? <p className={styles.settingsError} role="alert">{settingsError}</p> : null}
            <div className={styles.settingsSaveBar}><span>{saveState === "saved" ? "Homepage settings are live." : backend === "github" ? "Changes publish through GitHub." : "Changes save to this project."}</span><button disabled={saveState === "saving"} type="submit">{saveState === "saving" ? "Saving…" : "Save homepage settings"}</button></div>
          </form>

          <div className={styles.settingsNowSection}>
            <NowManager backend={backend} categories={settings.categories} initialItems={initialNowItems} key={initialNowItems.map((item) => `${item.id}:${item.label}:${item.title}:${item.url}`).join("|")} loadError="" loading={loading} onRetry={onRetry} onSaved={onNowSaved} posts={posts} />
          </div>
        </>
      ) : <AccountSettings />}
    </div>
  );
}

function AccountSettings() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<SaveState>("quiet");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { username?: string; email?: string; error?: string };
        if (!response.ok) throw new Error(result.error || "Account details could not be loaded.");
        setUsername(result.username || "");
        setEmail(result.email || "");
      })
      .catch((caught: Error) => { setState("error"); setMessage(caught.message); });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setState("error"); setMessage("The new passwords do not match."); return; }
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, newPassword }) });
      const result = await response.json() as { error?: string; emailConfirmationMayBeRequired?: boolean };
      if (!response.ok) throw new Error(result.error || "The account could not be updated.");
      setNewPassword("");
      setConfirmPassword("");
      setState("saved");
      setMessage(result.emailConfirmationMayBeRequired ? "Account updated. Check the new inbox if Supabase asks you to confirm the email." : "Account details updated.");
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "The account could not be updated.");
    }
  };

  return (
    <form className={styles.accountForm} onSubmit={submit}>
      <section className={styles.settingsCard}>
        <div className={styles.settingsCardIntro}><span>01</span><div><h2>Sign-in identity</h2><p>Use the username or email below the next time you enter Garden Studio.</p></div></div>
        <div className={styles.settingsFields}>
          <label><span>Username</span><input autoComplete="username" maxLength={64} required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label><span>Email</span><input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        </div>
      </section>
      <section className={styles.settingsCard}>
        <div className={styles.settingsCardIntro}><span>02</span><div><h2>Change password</h2><p>Leave both fields empty when you only want to update your username or email.</p></div></div>
        <div className={styles.settingsFields}>
          <label><span>New password</span><input autoComplete="new-password" minLength={12} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small>12+ characters with uppercase, lowercase, number, and symbol.</small></label>
          <label><span>Confirm new password</span><input autoComplete="new-password" minLength={newPassword ? 12 : undefined} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        </div>
      </section>
      {message ? <p className={state === "error" ? styles.settingsError : styles.settingsSuccess} role="status">{message}</p> : null}
      <div className={styles.settingsSaveBar}><span>Account changes are protected by your active session.</span><button disabled={state === "saving"} type="submit">{state === "saving" ? "Updating…" : "Update account"}</button></div>
    </form>
  );
}

type NowDestinationChoice = NowDestinationOption & {
  kind: "section" | "item";
  sectionLabel: string;
  sectionValue: string;
};

function NowDestinationPicker({
  contentGroups,
  onChange,
  sectionOptions,
  value,
}: {
  contentGroups: NowDestinationGroup[];
  onChange: (value: string) => void;
  sectionOptions: NowDestinationOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const choices = useMemo<NowDestinationChoice[]>(() => [
    ...sectionOptions.map((option) => ({
      ...option,
      kind: "section" as const,
      sectionLabel: option.label,
      sectionValue: option.value,
    })),
    ...contentGroups.flatMap((group) => group.options.map((option) => ({
      ...option,
      kind: "item" as const,
      sectionLabel: group.label,
      sectionValue: group.sectionValue,
    }))),
  ], [contentGroups, sectionOptions]);

  const currentChoice = choices.find((choice) => choice.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleChoices = choices.filter((choice) => {
    if (section !== "all" && choice.sectionValue !== section) return false;
    if (!normalizedQuery) return true;
    return [choice.label, choice.value, choice.sectionLabel, choice.kind === "section" ? "section" : "item"]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const currentSection = sectionOptions.find((option) => value === option.value || value.startsWith(`${option.value}/`));
    setSection(currentSection?.value || "all");
    setQuery("");
    setOpen(true);
  };

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className={`${styles.destinationPicker}${open ? ` ${styles.destinationPickerOpen}` : ""}`} ref={pickerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={styles.destinationTrigger}
        onClick={toggle}
        type="button"
      >
        <span className={styles.destinationTriggerIcon}><Icon name={value ? "link" : "plus"} /></span>
        <span className={styles.destinationTriggerCopy}>
          <strong>{currentChoice?.label || (value ? "Custom destination" : "Choose a destination")}</strong>
          <small>{currentChoice ? `${currentChoice.kind === "section" ? "Whole section" : currentChoice.sectionLabel} · ${currentChoice.value}` : value || "Optional — keep this item as plain text"}</small>
        </span>
        <Icon className={styles.destinationChevron} name="chevronDown" />
      </button>

      {open ? (
        <>
          <button aria-label="Close destination picker" className={styles.destinationBackdrop} onClick={() => setOpen(false)} type="button" />
          <div aria-label="Choose a Now destination" aria-modal="true" className={styles.destinationPopover} role="dialog">
            <header className={styles.destinationPopoverHeader}>
              <div><strong>Link to garden content</strong><span>{choices.length - sectionOptions.length} published items available</span></div>
              <button aria-label="Close destination picker" onClick={() => setOpen(false)} type="button"><Icon name="x" /></button>
            </header>

            <label className={styles.destinationSearch}>
              <Icon name="search" />
              <input
                aria-label="Search destinations"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, section, or path…"
                ref={searchRef}
                value={query}
              />
              {query ? <button aria-label="Clear search" onClick={() => setQuery("")} type="button"><Icon name="x" /></button> : null}
            </label>

            <nav aria-label="Filter destinations by section" className={styles.destinationFilters}>
              <button className={section === "all" ? styles.destinationFilterActive : ""} onClick={() => setSection("all")} type="button">All <span>{choices.length}</span></button>
              {sectionOptions.map((option) => {
                const count = 1 + (contentGroups.find((group) => group.sectionValue === option.value)?.options.length || 0);
                return <button className={section === option.value ? styles.destinationFilterActive : ""} key={option.value} onClick={() => setSection(option.value)} type="button">{option.label} <span>{count}</span></button>;
              })}
            </nav>

            <div aria-label="Available destinations" className={styles.destinationList} role="listbox">
              {!normalizedQuery && section === "all" ? (
                <button aria-selected={!value} className={`${styles.destinationOption} ${styles.destinationPlainOption}${!value ? ` ${styles.destinationOptionSelected}` : ""}`} onClick={() => choose("")} role="option" type="button">
                  <span className={styles.destinationOptionIcon}><Icon name="x" /></span>
                  <span><strong>No destination</strong><small>Keep it as plain text on the homepage</small></span>
                  {!value ? <Icon className={styles.destinationSelectedIcon} name="check" /> : null}
                </button>
              ) : null}

              {visibleChoices.map((choice) => (
                <button aria-selected={choice.value === value} className={`${styles.destinationOption}${choice.value === value ? ` ${styles.destinationOptionSelected}` : ""}`} key={choice.value} onClick={() => choose(choice.value)} role="option" type="button">
                  <span className={`${styles.destinationOptionIcon} ${choice.kind === "section" ? styles.destinationSectionIcon : ""}`}><Icon name={choice.kind === "section" ? "folder" : "file"} /></span>
                  <span><strong>{choice.label}</strong><small>{choice.kind === "section" ? "Whole section" : choice.sectionLabel}<i>{choice.value}</i></small></span>
                  {choice.value === value ? <Icon className={styles.destinationSelectedIcon} name="check" /> : null}
                </button>
              ))}

              {!visibleChoices.length ? <div className={styles.destinationEmpty}><Icon name="search" /><strong>No matching destination</strong><span>Try another title or choose a different section.</span></div> : null}
            </div>

            {value ? <button className={styles.destinationRemove} onClick={() => choose("")} type="button"><Icon name="x" /> Remove destination and keep as plain text</button> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function NowManager({
  backend,
  categories,
  initialItems,
  loadError,
  loading,
  onRetry,
  onSaved,
  posts,
}: {
  backend: "github" | "local";
  categories: GardenSettings["categories"];
  initialItems: GardenNowItem[];
  loadError: string;
  loading: boolean;
  onRetry: () => void;
  onSaved: (items: GardenNowItem[]) => void;
  posts: GardenPost[];
}) {
  const [items, setItems] = useState<GardenNowItem[]>(initialItems);
  const [saveState, setSaveState] = useState<SaveState>("quiet");
  const [saveError, setSaveError] = useState("");
  const { sectionOptions, contentGroups } = useMemo(() => buildNowDestinationOptions(categories, posts), [categories, posts]);

  const updateItem = <K extends keyof GardenNowItem>(index: number, field: K, value: GardenNowItem[K]) => {
    setSaveState("quiet");
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setSaveState("quiet");
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeItem = (index: number) => {
    setSaveState("quiet");
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addItem = () => {
    if (items.length >= 5) return;
    setSaveState("quiet");
    setItems((current) => [...current, emptyNowItem()]);
  };

  const save = async () => {
    const nextItems = items.map((item) => ({ ...item, label: item.label.trim(), title: item.title.trim(), url: item.url.trim() }));
    if (nextItems.some((item) => !item.title)) {
      setSaveError("Every Now item needs a title.");
      setSaveState("error");
      return;
    }
    setSaveError("");
    setSaveState("saving");
    try {
      await saveGardenNow(nextItems);
      setItems(nextItems);
      onSaved(nextItems);
      setSaveState("saved");
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "The Now section could not be saved.");
      setSaveState("error");
    }
  };

  return (
    <div className={styles.nowManager}>
      <header className={styles.nowManagerHeader}>
        <div><p>Homepage section</p><h1>What’s happening now</h1><span>Keep a small, living list of whatever you’re working on, reading, learning, watching, or thinking about.</span></div>
        <button className={styles.saveNowButton} disabled={loading || saveState === "saving"} onClick={() => void save()}>{saveState === "saving" ? "Saving…" : "Save Now section"}</button>
      </header>

      {loadError ? <div className={styles.errorBanner}><span>{loadError}</span><button onClick={onRetry}>Try again</button></div> : null}

      <div className={styles.nowManagerBody}>
        <section className={styles.nowItemEditor} aria-label="Now items">
          <div className={styles.nowEditorIntro}><strong>{loading ? "Opening…" : `${items.length} of 5 items`}</strong><span>Order here matches the homepage.</span></div>
          {items.map((item, index) => (
            <article className={styles.nowEditorRow} key={item.id}>
              <div className={styles.nowRowOrder}><span>{String(index + 1).padStart(2, "0")}</span><button disabled={index === 0} aria-label={`Move ${item.title || `item ${index + 1}`} up`} onClick={() => moveItem(index, -1)}>↑</button><button disabled={index === items.length - 1} aria-label={`Move ${item.title || `item ${index + 1}`} down`} onClick={() => moveItem(index, 1)}>↓</button></div>
              <div className={styles.nowFields}>
                <label><span>Context</span><input maxLength={50} placeholder="Reading, Working on, Learning…" value={item.label} onChange={(event) => updateItem(index, "label", event.target.value)} /></label>
                <label className={styles.nowTitleField}><span>What is it?</span><input maxLength={180} placeholder="The thing you want to share" value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} /></label>
                <div className={styles.nowLinkField}><span>Destination <em>optional</em></span><NowDestinationPicker contentGroups={contentGroups} onChange={(value) => updateItem(index, "url", value)} sectionOptions={sectionOptions} value={item.url} /></div>
              </div>
              <button className={styles.removeNowItem} aria-label={`Remove ${item.title || `item ${index + 1}`}`} onClick={() => removeItem(index)}><Icon name="trash" /></button>
            </article>
          ))}
          {!items.length && !loading ? <div className={styles.emptyNowItems}><span>✦</span><h2>Your Now list is empty.</h2><p>Add anything that has your attention at the moment.</p></div> : null}
          <button className={styles.addNowItem} disabled={items.length >= 5} onClick={addItem}><Icon name="plus" />{items.length >= 5 ? "The homepage holds five items" : "Add another item"}</button>
          {saveError ? <p className={styles.nowSaveError}>{saveError}</p> : null}
        </section>

        <aside className={styles.nowHelp}>
          <span>✦</span><h2>A useful Now list stays loose.</h2><p>The context is completely free-form. Use “Reading,” “Making,” “Recovering from,” or anything else that fits.</p><p>Choose a garden section or a specific published item from the destination menu. Select “No link” when it should stay plain text.</p><small>{saveState === "saved" ? "Saved and ready for the homepage." : backend === "github" ? "Saving publishes this list through GitHub." : "Saving updates this project."}</small>
        </aside>
      </div>
    </div>
  );
}

function StudioLoading({ label }: { label: string }) {
  return <main className={styles.studioLoading}><span>✦</span><p>{label}</p></main>;
}

function StudioLogin() {
  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span className={styles.loginMark}>✦</span><p>Private writing space</p><h1>Your session has ended.</h1><span>Only the repository owner can enter this studio.</span>
        <Link className={styles.primaryLogin} href="/admin/login">Sign in again</Link>
        <Link className={styles.loginBack} href="/">← Back to the garden</Link>
      </section>
    </main>
  );
}

function PostEditor({
  backend,
  initialPost,
  onBack,
  onSaved,
  onDelete,
}: {
  backend: "github" | "local";
  initialPost: GardenPost;
  onBack: () => void;
  onSaved: (post: GardenPost) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [post, setPost] = useState<GardenPost>(() => {
    if (typeof window === "undefined") return initialPost;
    const local = window.localStorage.getItem(`${LOCAL_DRAFT_PREFIX}${initialPost.id}`);
    if (!local) return initialPost;
    try {
      const recovered = JSON.parse(local) as GardenPost;
      return new Date(recovered.updatedAt).getTime() >= new Date(initialPost.updatedAt).getTime() ? recovered : initialPost;
    } catch {
      window.localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${initialPost.id}`);
      return initialPost;
    }
  });
  const [saveState, setSaveState] = useState<SaveState>("quiet");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const bodyImageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = { ...post, updatedAt: new Date().toISOString() };
      window.localStorage.setItem(`${LOCAL_DRAFT_PREFIX}${post.id}`, JSON.stringify(draft));
      setSaveState("saved");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [post]);

  const setField = <K extends keyof GardenPost>(field: K, value: GardenPost[K]) => {
    setSaveState("quiet");
    setPost((current) => ({ ...current, [field]: value }));
  };

  const updateCategory = (category: string) => {
    setSaveState("quiet");
    setPost((current) => {
      if (category !== "Shelf") return { ...current, category };
      const shelfCategory = normalizeShelfCategory(current.shelfCategory);
      return {
        ...current,
        category,
        shelfCategory,
        shelfStatus: normalizeShelfStatus(shelfCategory, current.shelfStatus),
      };
    });
  };

  const updateShelfCategory = (value: string) => {
    const shelfCategory = normalizeShelfCategory(value);
    setSaveState("quiet");
    setPost((current) => ({
      ...current,
      shelfCategory,
      shelfStatus: normalizeShelfStatus(shelfCategory, current.shelfStatus),
    }));
  };

  const updateTitle = (title: string) => {
    setSaveState("quiet");
    setPost((current) => ({
      ...current,
      title,
      slug: !current.slug || current.slug === slugify(current.title) ? slugify(title) : current.slug,
      seoTitle: !current.seoTitle || current.seoTitle === current.title ? title : current.seoTitle,
    }));
  };

  const save = async (status: PostStatus) => {
    setSaveState("saving");
    setError("");
    const now = new Date().toISOString();
    const nextPost: GardenPost = {
      ...post,
      title: post.title.trim() || "Untitled note",
      slug: post.slug.trim() || slugify(post.title || "untitled-note"),
      seoTitle: post.seoTitle.trim() || post.title.trim(),
      seoDescription: post.seoDescription.trim() || post.description.trim(),
      status,
      updatedAt: now,
      publishedAt: status === "Published" ? post.publishedAt || now : "",
    };
    try {
      await saveGardenPost(nextPost);
      window.localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${post.id}`);
      setPost(nextPost);
      onSaved(nextPost);
      setSaveState("saved");
    } catch (caught) {
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : "This note could not be saved.");
    }
  };

  const insertAtCursor = (value: string) => {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? post.content.length;
    const end = textarea?.selectionEnd ?? post.content.length;
    setField("content", `${post.content.slice(0, start)}${value}${post.content.slice(end)}`);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + value.length, start + value.length);
    });
  };

  const uploadIntoBody = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadGardenImage(file);
      insertAtCursor(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try { setField("coverImage", await uploadGardenImage(file)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "That cover could not be uploaded."); }
    finally { setUploading(false); }
  };

  const uploadGallery = async (files: FileList | null) => {
    const selected = Array.from(files || []).slice(0, Math.max(0, 12 - (post.gallery?.length || 0)));
    if (!selected.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(selected.map(uploadGardenImage));
      setField("gallery", [...(post.gallery || []), ...urls]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Those photos could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (tag && !post.tags.includes(tag)) setField("tags", [...post.tags, tag]);
    setTagInput("");
  };

  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
  const isShelfItem = post.category === "Shelf";
  const editorCopy = post.category === "Build"
    ? { title: "Name the project…", description: "A crisp one-line summary of what you made", body: "Tell the build story: the problem, decisions, process, and result…", bodyLabel: "Project story" }
    : post.category === "Life"
      ? { title: "Name this moment…", description: "A short caption or place and date", body: "Keep the memory, what happened, and what you want to remember…", bodyLabel: "Story" }
      : post.category === "Shelf"
        ? { title: "Title of the book, film, album, show, or game…", description: "Author, director, artist, studio, or a tiny note", body: "", bodyLabel: "" }
        : { title: "Give this thought a name…", description: "A short invitation into the note (optional)", body: "Start anywhere. A fragment is enough.\n\nDrop or paste an image right here…", bodyLabel: "Write in Markdown" };

  return (
    <main className={styles.editorPage}>
      <header className={styles.editorHeader}>
        <button className={styles.back} onClick={onBack}>← <span>Library</span></button>
        <div className={styles.saveIndicator}>
          <i className={saveState === "error" ? styles.errorDot : ""} />
          {saveState === "saving" ? "Publishing changes…" : saveState === "error" ? "Not saved" : saveState === "saved" ? "Draft safe on this device" : backend === "github" ? "Ready to publish to GitHub" : "Ready to save to project"}
        </div>
        <div className={styles.editorHeaderActions}>
          <button className={styles.previewButton} onClick={() => setPreviewOpen(true)}><Icon name="eye" /> Preview</button>
          <button onClick={() => void save("Draft")} disabled={saveState === "saving"}>Save draft</button>
          <button className={styles.publishButton} onClick={() => void save("Published")} disabled={saveState === "saving"}><span>{post.status === "Published" ? "Update live note" : "Publish note"}</span> ↗</button>
        </div>
      </header>

      <div className={styles.editorWorkspace}>
        <section className={styles.writingCanvas}>
          <div className={styles.canvasMeta}><span className={post.status === "Published" ? styles.liveLabel : ""}><i />{post.status === "Published" ? "Published" : "Growing"}</span><span>{post.category}</span></div>
          <textarea className={styles.editorTitle} rows={2} placeholder={editorCopy.title} value={post.title} onChange={(event) => updateTitle(event.target.value)} />
          <textarea className={styles.editorDescription} rows={2} placeholder={editorCopy.description} value={post.description} onChange={(event) => setField("description", event.target.value)} />

          {post.coverImage ? <div className={styles.coverPreview}><img src={post.coverImage} alt="" /><button onClick={() => setField("coverImage", "")}><Icon name="x" /> Remove cover</button></div> : null}

          {isShelfItem ? (
            <section className={styles.shelfComposer}>
              <div><span>Item type</span><select value={normalizeShelfCategory(post.shelfCategory)} onChange={(event) => updateShelfCategory(event.target.value)}>{shelfCategories.map((category) => <option key={category}>{category}</option>)}</select></div>
              {normalizeShelfCategory(post.shelfCategory) !== "Music" ? <div><span>Progress</span><select value={normalizeShelfStatus(normalizeShelfCategory(post.shelfCategory), post.shelfStatus)} onChange={(event) => setField("shelfStatus", normalizeShelfStatus(normalizeShelfCategory(post.shelfCategory), event.target.value))}>{shelfStatuses[normalizeShelfCategory(post.shelfCategory)].map((status) => <option key={status}>{status}</option>)}</select></div> : <div className={styles.musicHint}><span>Music</span><p>Music stays clean and has no reading-style progress badge.</p></div>}
              <label><span>Public link <em>optional</em></span><input type="url" placeholder="Goodreads, Spotify, Letterboxd, or any public URL" value={post.externalUrl || ""} onChange={(event) => setField("externalUrl", event.target.value)} /></label>
              <p><Icon name="sparkles" /> Shelf items are intentionally focused: title, creator, cover, type, progress, and link. There is no long note field here.</p>
            </section>
          ) : <>
          <div className={styles.bodyToolbar}>
            <span>{editorCopy.bodyLabel}</span>
            <div>
              <button title="Heading" onClick={() => insertAtCursor("\n## Heading\n")}>H2</button>
              <button title="Bold" onClick={() => insertAtCursor("**bold**")}><b>B</b></button>
              <button title="Quote" onClick={() => insertAtCursor("\n> A thought worth holding\n")}>❝</button>
              <button title="Link" onClick={() => insertAtCursor("[link](https://)")}><Icon name="link" /></button>
              <button title="Image" onClick={() => bodyImageInput.current?.click()}><Icon name="image" /></button>
            </div>
          </div>
          <textarea
            ref={bodyRef}
            className={styles.bodyEditor}
            value={post.content}
            onChange={(event) => setField("content", event.target.value)}
            onPaste={(event: ClipboardEvent<HTMLTextAreaElement>) => {
              const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
              if (image) { event.preventDefault(); void uploadIntoBody(image); }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event: DragEvent<HTMLTextAreaElement>) => {
              const image = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/"));
              if (image) { event.preventDefault(); void uploadIntoBody(image); }
            }}
            placeholder={editorCopy.body}
          />
          <div className={styles.wordCount}><span>{wordCount} {wordCount === 1 ? "word" : "words"}</span><span>{uploading ? "Uploading image…" : "Images can be pasted or dropped into the page"}</span></div>
          <input hidden ref={bodyImageInput} accept="image/*" type="file" onChange={(event) => void uploadIntoBody(event.target.files?.[0])} />
          </>}
          {error ? <div className={styles.editorError}>{error}</div> : null}
        </section>

        <aside className={`${styles.detailsPanel} ${detailsOpen ? "" : styles.detailsClosed}`}>
          <button className={styles.detailsToggle} onClick={() => setDetailsOpen((open) => !open)}><span>Note details</span><Icon name="chevronDown" /></button>
          {detailsOpen ? (
            <div className={styles.detailsBody}>
              <label><span>Path</span><select value={post.category} onChange={(event) => updateCategory(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><small>Where this note lives in the garden.</small></label>
              {post.category !== "Shelf" ? <label><span>Tags</span><div className={styles.tagsInput}>{post.tags.map((tag) => <button key={tag} onClick={() => setField("tags", post.tags.filter((item) => item !== tag))}>#{tag} ×</button>)}<input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onBlur={addTag} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} placeholder="Add a tag" /></div></label> : null}
              <div className={styles.detailDivider} />
              <label><span>{post.category === "Shelf" ? "Poster or cover" : "Cover image"}</span>{post.coverImage ? <button className={styles.changeCover} onClick={() => coverInput.current?.click()}><Icon name="image" /> Change cover</button> : <button className={styles.addCover} onClick={() => coverInput.current?.click()}><Icon name="upload" /><strong>{post.category === "Shelf" ? "Upload a poster" : "Add a cover"}</strong><small>JPG, PNG or WebP · 8 MB max</small></button>}</label>
              <input hidden ref={coverInput} accept="image/*" type="file" onChange={(event) => void uploadCover(event.target.files?.[0])} />
              {post.category !== "Shelf" ? <label><span>{post.category === "Build" ? "Project link" : "Featured link"}</span><input type="url" placeholder="https://…" value={post.externalUrl || ""} onChange={(event) => setField("externalUrl", event.target.value)} /></label> : null}
              {post.category === "Build" ? <label><span>Demo video</span><input type="url" placeholder="YouTube, Vimeo, or video URL" value={post.videoUrl || ""} onChange={(event) => setField("videoUrl", event.target.value)} /></label> : null}
              {post.category === "Life" ? <div className={styles.gallerySetting}><span>Photo set</span>{post.gallery?.length ? <div>{post.gallery.map((image, index) => <button key={`${image}-${index}`} onClick={() => setField("gallery", post.gallery?.filter((_, imageIndex) => imageIndex !== index) || [])}><img src={image} alt="" /><i>×</i></button>)}</div> : null}<button className={styles.addGallery} onClick={() => galleryInput.current?.click()}><Icon name="image" /> Add photos</button><small>Up to 12 photos for a Life entry.</small><input hidden multiple ref={galleryInput} accept="image/*" type="file" onChange={(event) => void uploadGallery(event.target.files)} /></div> : null}
              <div className={styles.detailDivider} />
              <label><span>Address</span><div className={styles.slugInput}><span>/</span><input value={post.slug} onChange={(event) => setField("slug", slugify(event.target.value))} /></div></label>
              {!deleteArmed ? <button className={styles.removeNote} onClick={() => setDeleteArmed(true)}><Icon name="trash" /> Remove this note</button> : <div className={styles.deleteConfirm}><p>This removes the note from the repository.</p><div><button onClick={() => setDeleteArmed(false)}>Keep it</button><button onClick={() => void onDelete(post.id)}>Remove</button></div></div>}
            </div>
          ) : null}
        </aside>
      </div>

      {previewOpen ? (
        <div className={styles.previewOverlay}>
          <header><span><i />Garden preview</span><button onClick={() => setPreviewOpen(false)}><Icon name="x" /> Close</button></header>
          <article className={styles.previewArticle}>
            <p>{post.category === "Shelf" ? `Shelf · ${normalizeShelfCategory(post.shelfCategory)}${normalizeShelfCategory(post.shelfCategory) !== "Music" ? ` · ${normalizeShelfStatus(normalizeShelfCategory(post.shelfCategory), post.shelfStatus)}` : ""}` : `${post.category} ${post.tags.length ? `· ${post.tags.map((tag) => `#${tag}`).join(" ")}` : ""}`}</p>
            <h1>{post.title || "Untitled note"}</h1>
            {post.description ? <p className={styles.previewDescription}>{post.description}</p> : null}
            {post.coverImage ? <img className={styles.previewCover} src={post.coverImage} alt="" /> : null}
            <MarkdownPreview content={post.content} />
          </article>
        </div>
      ) : null}
    </main>
  );
}
