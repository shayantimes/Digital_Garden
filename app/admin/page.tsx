"use client";

/* Uploaded images are repository assets and intentionally bypass Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
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
  fetchGardenPosts,
  importGardenPosts,
  loadLegacyGardenPosts,
  removeGardenPost,
  saveGardenPost,
  uploadGardenImage,
} from "../lib/garden-content";
import styles from "./admin.module.css";

type Filter = "All" | "Draft" | "Published";
type SaveState = "quiet" | "saving" | "saved" | "error";

const LOCAL_DRAFT_PREFIX = "garden-studio-draft:";
const categories = defaultGardenSettings.categories.map((category) => category.label);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function emptyPost(seed = ""): GardenPost {
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
    category: "Notes",
    tags: [],
    slug: slugify(title),
    coverImage: "",
    gallery: [],
    videoUrl: "",
    externalUrl: "",
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
  const [backend, setBackend] = useState<"github" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [section, setSection] = useState("All");
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState("");
  const [editor, setEditor] = useState<GardenPost | null>(null);
  const [legacyPosts, setLegacyPosts] = useState<GardenPost[]>([]);
  const [toast, setToast] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchGardenPosts();
      setPosts(result.posts);
      setBackend(result.backend);
      const legacy = await loadLegacyGardenPosts();
      const candidates = legacy.filter((oldPost) => {
        const current = result.posts.find((post) => post.id === oldPost.id);
        return !current || new Date(oldPost.updatedAt).getTime() > new Date(current.updatedAt).getTime();
      });
      setLegacyPosts(candidates);
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
      .filter((post) => filter === "All" || post.status === filter)
      .filter((post) => section === "All" || post.category === section)
      .filter((post) => !needle || [post.title, post.description, post.content, post.tags.join(" ")].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [filter, posts, query, section]);

  const counts = useMemo(() => ({
    All: posts.length,
    Draft: posts.filter((post) => post.status !== "Published").length,
    Published: posts.filter((post) => post.status === "Published").length,
  }), [posts]);

  const saveOne = async (post: GardenPost, message: string) => {
    await saveGardenPost(post);
    setPosts((current) => current.some((item) => item.id === post.id)
      ? current.map((item) => item.id === post.id ? post : item)
      : [post, ...current]);
    setToast(message);
  };

  const captureSeed = async () => {
    if (!seed.trim()) {
      setEditor(emptyPost());
      return;
    }
    const note = emptyPost(seed);
    try {
      await saveOne(note, "Idea captured as a draft");
      setSeed("");
      setEditor(note);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That idea could not be saved.");
    }
  };

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
    const byId = new Map(posts.map((post) => [post.id, post]));
    legacyPosts.forEach((post) => byId.set(post.id, post));
    const merged = Array.from(byId.values());
    try {
      await importGardenPosts(legacyPosts);
      setPosts(merged);
      setToast(`${legacyPosts.length} old ${legacyPosts.length === 1 ? "note" : "notes"} brought into the new studio`);
      setLegacyPosts([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The old notes could not be imported.");
    }
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shayan-garden-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Backup downloaded");
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
        <div className={styles.brand}><span>G</span><div><strong>Garden</strong><small>Writing studio</small></div></div>
        <button className={styles.writeButton} onClick={() => setEditor(emptyPost())}><Icon name="plus" /> Write a note</button>

        <nav className={styles.libraryNav} aria-label="Content filters">
          <p>Library</p>
          {(["All", "Draft", "Published"] as Filter[]).map((item) => (
            <button className={filter === item && section === "All" ? styles.navActive : ""} key={item} onClick={() => { setFilter(item); setSection("All"); }}>
              <span>{item === "All" ? "All notes" : item === "Draft" ? "Growing" : "Published"}</span><b>{counts[item]}</b>
            </button>
          ))}
          <p>Paths</p>
          {categories.map((item) => (
            <button className={section === item ? styles.navActive : ""} key={item} onClick={() => { setSection(item); setFilter("All"); }}>
              <span>{item}</span><b>{posts.filter((post) => post.category === item).length}</b>
            </button>
          ))}
        </nav>

        <div className={styles.railFooter}>
          <button onClick={() => importInput.current?.click()}><Icon name="upload" /> Import Markdown</button>
          <button onClick={exportBackup}><Icon name="archive" /> Download backup</button>
          <Link href="/" target="_blank"><Icon name="eye" /> Open garden</Link>
          <form action="/api/auth/logout" method="post" className={styles.logoutForm}><button type="submit"><Icon name="x" /> Sign out</button></form>
          <span className={styles.storageNote}><i className={backend === "github" ? styles.liveDot : ""} />{backend === "github" ? "Publishing to GitHub" : "Saving to this project"}</span>
        </div>
        <input ref={importInput} hidden multiple accept=".md,.mdx,.txt,text/markdown,text/plain" type="file" onChange={importMarkdown} />
      </aside>

      <section className={styles.library}>
        <header className={styles.libraryHeader}>
          <div><p>Your digital garden</p><h1>{section === "All" ? (filter === "All" ? "Everything you’re growing" : filter === "Draft" ? "Ideas still growing" : "Out in the garden") : section}</h1></div>
          <label className={styles.search}><Icon name="search" /><input aria-label="Search notes" placeholder="Search every word…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </header>

        {legacyPosts.length ? (
          <div className={styles.migrationBanner}>
            <span><Icon name="sparkles" /></span>
            <div><strong>Your old studio left {legacyPosts.length} {legacyPosts.length === 1 ? "note" : "notes"} in this browser.</strong><p>Bring them into the new Git-backed library before removing the old system.</p></div>
            <button onClick={() => void importLegacy()}>Bring them in</button>
          </div>
        ) : null}

        <section className={styles.quickCapture}>
          <span className={styles.seedMark}>✦</span>
          <textarea value={seed} onChange={(event) => setSeed(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void captureSeed(); }} placeholder="Drop a thought here. First line becomes the title…" rows={3} />
          <div><span>⌘ Enter to keep it</span><button onClick={() => void captureSeed()}>{seed.trim() ? "Keep this idea" : "Open blank note"} <span>→</span></button></div>
        </section>

        {error ? <div className={styles.errorBanner}><span>{error}</span><button onClick={() => { setError(""); void load(); }}>Try again</button></div> : null}

        <div className={styles.listHeading}><span>{loading ? "Opening…" : `${visiblePosts.length} ${visiblePosts.length === 1 ? "note" : "notes"}`}</span><span>Recently tended</span></div>
        <div className={styles.noteList}>
          {visiblePosts.map((post) => (
            <button className={styles.noteRow} key={post.id} onClick={() => setEditor(post)}>
              <span className={styles.noteGlyph}>{post.coverImage ? <img src={post.coverImage} alt="" /> : post.title.slice(0, 1).toUpperCase() || "·"}</span>
              <span className={styles.noteCopy}><strong>{post.title || "Untitled note"}</strong><small>{post.description || post.content.replace(/[#>*_`\n]/g, " ").trim() || "An empty page, ready when you are."}</small><em>{post.tags.slice(0, 3).map((tag) => `#${tag}`).join("  ")}</em></span>
              <span className={styles.notePath}>{post.category}</span>
              <span className={`${styles.noteStatus} ${post.status === "Published" ? styles.isPublished : ""}`}><i />{post.status === "Published" ? "Published" : "Growing"}</span>
              <span className={styles.noteDate}>{relativeDate(post.updatedAt)}</span>
              <span className={styles.noteArrow}>↗</span>
            </button>
          ))}
          {!loading && !visiblePosts.length ? <div className={styles.emptyLibrary}><span>✦</span><h2>Nothing here yet.</h2><p>Plant a quick thought above or write a full note.</p></div> : null}
        </div>
      </section>
      {toast ? <div className={styles.toast}><Icon name="check" />{toast}</div> : null}
    </main>
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
        <Link className={styles.githubLogin} href="/api/auth/login">Continue with GitHub</Link>
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

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (tag && !post.tags.includes(tag)) setField("tags", [...post.tags, tag]);
    setTagInput("");
  };

  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;

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
          <textarea className={styles.editorTitle} rows={2} placeholder="Give this thought a name…" value={post.title} onChange={(event) => updateTitle(event.target.value)} />
          <textarea className={styles.editorDescription} rows={2} placeholder="A short invitation into the note (optional)" value={post.description} onChange={(event) => setField("description", event.target.value)} />

          {post.coverImage ? <div className={styles.coverPreview}><img src={post.coverImage} alt="" /><button onClick={() => setField("coverImage", "")}><Icon name="x" /> Remove cover</button></div> : null}

          <div className={styles.bodyToolbar}>
            <span>Write in Markdown</span>
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
            placeholder="Start anywhere. A fragment is enough.\n\nDrop or paste an image right here…"
          />
          <div className={styles.wordCount}><span>{wordCount} {wordCount === 1 ? "word" : "words"}</span><span>{uploading ? "Uploading image…" : "Images can be pasted or dropped into the page"}</span></div>
          {error ? <div className={styles.editorError}>{error}</div> : null}
          <input hidden ref={bodyImageInput} accept="image/*" type="file" onChange={(event) => void uploadIntoBody(event.target.files?.[0])} />
        </section>

        <aside className={`${styles.detailsPanel} ${detailsOpen ? "" : styles.detailsClosed}`}>
          <button className={styles.detailsToggle} onClick={() => setDetailsOpen((open) => !open)}><span>Note details</span><Icon name="chevronDown" /></button>
          {detailsOpen ? (
            <div className={styles.detailsBody}>
              <label><span>Path</span><select value={post.category} onChange={(event) => setField("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><small>Where this note lives in the garden.</small></label>
              <label><span>Tags</span><div className={styles.tagsInput}>{post.tags.map((tag) => <button key={tag} onClick={() => setField("tags", post.tags.filter((item) => item !== tag))}>#{tag} ×</button>)}<input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onBlur={addTag} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} placeholder="Add a tag" /></div></label>
              <div className={styles.detailDivider} />
              <label><span>Cover image</span>{post.coverImage ? <button className={styles.changeCover} onClick={() => coverInput.current?.click()}><Icon name="image" /> Change cover</button> : <button className={styles.addCover} onClick={() => coverInput.current?.click()}><Icon name="upload" /><strong>Add a cover</strong><small>JPG, PNG or WebP · 8 MB max</small></button>}</label>
              <input hidden ref={coverInput} accept="image/*" type="file" onChange={(event) => void uploadCover(event.target.files?.[0])} />
              <label><span>Featured link</span><input type="url" placeholder="https://…" value={post.externalUrl || ""} onChange={(event) => setField("externalUrl", event.target.value)} /></label>
              <label><span>Video</span><input type="url" placeholder="YouTube, Vimeo, or video URL" value={post.videoUrl || ""} onChange={(event) => setField("videoUrl", event.target.value)} /></label>
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
            <p>{post.category} {post.tags.length ? `· ${post.tags.map((tag) => `#${tag}`).join(" ")}` : ""}</p>
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
