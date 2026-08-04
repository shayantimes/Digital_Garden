"use client";

/* User-selected data/blob images are intentionally rendered without optimization. */
/* eslint-disable @next/next/no-img-element */

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { starterActivity, starterPosts } from "./data";
import { Icon, type IconName } from "./icons";
import {
  defaultGardenSettings,
  normalizeSettings,
  SETTINGS_EVENT,
  SETTINGS_KEY,
  slugifySetting,
} from "./settings";
import type { ActivityItem, GardenPost, GardenSettings, PostStatus } from "./types";
import { loadGardenPosts, saveGardenPosts } from "../lib/garden-content";
import styles from "./admin.module.css";

const THEME_KEY = "shayan-garden-admin-theme";
type Section = "content" | "archive" | "media" | "comments" | "newsletter" | "structure";
type EditorMode = "edit" | "new";

const navItems: { id: Section; label: string; icon: IconName }[] = [
  { id: "content", label: "Content", icon: "file" },
  { id: "archive", label: "Archive", icon: "archive" },
  { id: "media", label: "Media library", icon: "image" },
  { id: "comments", label: "Comments", icon: "comment" },
  { id: "newsletter", label: "Newsletter", icon: "mail" },
  { id: "structure", label: "Site structure", icon: "layout" },
];

function emptyPost(category: string): GardenPost {
  const now = new Date().toISOString();
  return {
    id: `post-${Date.now()}`,
    title: "",
    description: "",
    content: "",
    status: "Draft",
    type: "Content",
    category,
    tags: [],
    slug: "",
    coverImage: "",
    gallery: [],
    videoUrl: "",
    externalUrl: "",
    seoTitle: "",
    seoDescription: "",
    updatedAt: now,
    publishedAt: "",
    likes: 0,
    bookmarks: 0,
    comments: 0,
    versions: [],
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatDate(value: string) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function relativeDate(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

function statusClass(status: PostStatus) {
  return status === "Published"
    ? styles.published
    : status === "Scheduled"
      ? styles.scheduled
      : styles.draft;
}

function inlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={index}>{token.slice(1, -1)}</code>;
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a href={link[2]} key={index} rel="noreferrer" target="_blank">
          {link[1]}
        </a>
      );
    }
    return token;
  });
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className={styles.markdownPreview}>
      {lines.map((line, index) => {
        if (line.startsWith("### ")) return <h3 key={index}>{inlineMarkdown(line.slice(4))}</h3>;
        if (line.startsWith("## ")) return <h2 key={index}>{inlineMarkdown(line.slice(3))}</h2>;
        if (line.startsWith("# ")) return <h1 key={index}>{inlineMarkdown(line.slice(2))}</h1>;
        if (line.startsWith("> ")) return <blockquote key={index}>{inlineMarkdown(line.slice(2))}</blockquote>;
        if (line.startsWith("- ")) return <li key={index}>{inlineMarkdown(line.slice(2))}</li>;
        if (!line.trim()) return <span className={styles.lineBreak} key={index} />;
        return <p key={index}>{inlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export default function AdminPage() {
  const [posts, setPosts] = useState<GardenPost[]>(starterPosts);
  const [activity, setActivity] = useState<ActivityItem[]>(starterActivity);
  const [section, setSection] = useState<Section>("content");
  const [editor, setEditor] = useState<{ mode: EditorMode; post: GardenPost } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [settings, setSettings] = useState<GardenSettings>(defaultGardenSettings);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void loadGardenPosts().then((storedPosts) => {
        if (!active) return;
        if (storedPosts !== undefined) setPosts(storedPosts);
        setHydrated(true);
      });
      const storedTheme = window.localStorage.getItem(THEME_KEY);
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        try {
          setSettings(normalizeSettings(JSON.parse(storedSettings)));
        } catch {
          window.localStorage.removeItem(SETTINGS_KEY);
        }
      }
      if (storedTheme === "dark") setTheme("dark");
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      void saveGardenPosts(posts).catch(() => {
        setToast("Content could not be saved. Try freeing some browser storage.");
      });
    }
  }, [posts, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  }, [settings, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string) => setToast(message);

  const switchTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  };

  const savePost = async (nextPost: GardenPost, message: string) => {
    const exists = posts.some((post) => post.id === nextPost.id);
    const nextPosts = exists
      ? posts.map((post) => (post.id === nextPost.id ? nextPost : post))
      : [nextPost, ...posts];
    try {
      await saveGardenPosts(nextPosts);
    } catch {
      showToast("This content could not be saved. Your browser may be out of storage.");
      throw new Error("Content persistence failed");
    }
    setPosts(nextPosts);
    setActivity((current) => [
      {
        id: `activity-${Date.now()}`,
        action: nextPost.status === "Published" ? "Published" : "Draft saved",
        detail: nextPost.title || "Untitled note",
        time: "Just now",
        kind: (nextPost.status === "Published" ? "publish" : "edit") as ActivityItem["kind"],
      },
      ...current,
    ].slice(0, 8));
    setEditor({ mode: "edit", post: nextPost });
    showToast(message);
  };

  const deletePost = (id: string) => {
    setPosts((current) => current.filter((post) => post.id !== id));
    setEditor(null);
    showToast("Post moved to trash");
  };

  const navigate = (next: Section) => {
    setSection(next);
    setEditor(null);
    setMobileNav(false);
  };

  const openNewContent = () => {
    const preferredCategory = settings.categories.find((category) => category.slug === "notes") || settings.categories[0];
    setEditor({ mode: "new", post: emptyPost(preferredCategory?.label || "Notes") });
  };

  const saveSettings = (next: GardenSettings) => {
    const normalized = normalizeSettings(next);
    setPosts((current) => current.map((post) => {
      const previousCategory = settings.categories.find((category) => category.label === post.category);
      const renamedCategory = previousCategory
        ? normalized.categories.find((category) => category.id === previousCategory.id)
        : undefined;
      return renamedCategory ? { ...post, category: renamedCategory.label } : post;
    }));
    setSettings(normalized);
    showToast("Site structure saved");
  };

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((post) => post.status === "Published").length,
      draft: posts.filter((post) => post.status === "Draft").length,
      comments: posts.reduce((sum, post) => sum + post.comments, 0),
    }),
    [posts],
  );

  return (
    <main className={`${styles.admin} ${theme === "dark" ? styles.dark : ""}`}>
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Icon name="sparkles" /></span>
          <div><strong>Garden</strong><span>Admin studio</span></div>
          <button className={styles.mobileClose} onClick={() => setMobileNav(false)} aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className={styles.sidebarNav} aria-label="Admin navigation">
          <p>Workspace</p>
          {navItems.map((item) => (
            <button
              className={section === item.id && !editor ? styles.navActive : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "comments" && counts.comments > 0 ? <b>{counts.comments}</b> : null}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <button onClick={() => navigate("structure")}>
            <Icon name="settings" /> <span>Settings</span>
          </button>
          <Link href="/" target="_blank"><Icon name="eye" /> <span>View garden</span></Link>
          <div className={styles.profile}>
            <span className={styles.avatar}>S</span>
            <div><strong>Shayan</strong><span>Garden keeper</span></div>
            <Icon name="more" />
          </div>
        </div>
      </aside>

      {mobileNav ? <button aria-label="Close menu overlay" className={styles.backdrop} onClick={() => setMobileNav(false)} /> : null}

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div className={styles.breadcrumb}>
            <span>Digital garden</span>
            <b>/</b>
            <strong>{editor ? (editor.mode === "new" ? "New content" : "Edit content") : navItems.find((item) => item.id === section)?.label}</strong>
          </div>
          <div className={styles.topActions}>
            <button className={styles.iconButton} onClick={switchTheme} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}>
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
            {!editor ? (
              <button className={styles.primaryButton} onClick={openNewContent}>
                <Icon name="plus" /> New content
              </button>
            ) : null}
          </div>
        </header>

        {editor ? (
          <PostEditor
            key={editor.post.id}
            initialPost={editor.post}
            isNew={editor.mode === "new"}
            onBack={() => setEditor(null)}
            onDelete={deletePost}
            onSave={savePost}
            onToast={showToast}
            categories={settings.categories.map((category) => category.label)}
          />
        ) : (
          <div className={styles.pageContent}>
            {section === "content" ? (
              <ContentDashboard
                activity={activity}
                counts={counts}
                posts={posts}
                onEdit={(post) => setEditor({ mode: "edit", post })}
                onNew={openNewContent}
                headerName={settings.headerName}
                categories={settings.categories.map((category) => category.label)}
              />
            ) : null}
            {section === "archive" ? <ArchivePanel posts={posts} onEdit={(post) => setEditor({ mode: "edit", post })} /> : null}
            {section === "media" ? <MediaPanel media={media} posts={posts} onMedia={setMedia} onToast={showToast} /> : null}
            {section === "comments" ? <CommentsPanel onToast={showToast} /> : null}
            {section === "newsletter" ? <NewsletterPanel onToast={showToast} /> : null}
            {section === "structure" ? <SiteStructurePanel posts={posts} settings={settings} onSave={saveSettings} /> : null}
          </div>
        )}
      </section>
      {toast ? <div className={styles.toast}><Icon name="check" />{toast}</div> : null}
    </main>
  );
}

function ContentDashboard({
  activity,
  counts,
  posts,
  onEdit,
  onNew,
  headerName,
  categories,
}: {
  activity: ActivityItem[];
  counts: { all: number; published: number; draft: number; comments: number };
  posts: GardenPost[];
  onEdit: (post: GardenPost) => void;
  onNew: () => void;
  headerName: string;
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | PostStatus>("All");
  const [sort, setSort] = useState<"updated" | "title" | "tag" | "category">("updated");
  const [category, setCategory] = useState("All");

  const visiblePosts = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return posts
      .filter((post) => status === "All" || post.status === status)
      .filter((post) => category === "All" || post.category === category)
      .filter((post) =>
        !normalized ||
        [post.title, post.description, post.category, post.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "tag") return (a.tags[0] || "").localeCompare(b.tags[0] || "");
        if (sort === "category") return a.category.localeCompare(b.category);
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [category, posts, query, sort, status]);

  return (
    <>
      <div className={styles.pageHeading}>
        <div><p className={styles.kicker}>Your workspace</p><h1>Good morning, {headerName}.</h1><span>Here’s what’s growing in your garden.</span></div>
        <button className={styles.secondaryButton} onClick={onNew}><Icon name="plus" />Add content</button>
      </div>

      <div className={styles.statGrid}>
        <StatCard icon="file" label="Total content" value={counts.all} detail="Across your whole garden" color="violet" />
        <StatCard icon="check" label="Published" value={counts.published} detail="Live in your garden" color="green" />
        <StatCard icon="edit" label="Drafts" value={counts.draft} detail="Waiting to be tended" color="amber" />
        <StatCard icon="comment" label="Comments" value={counts.comments} detail="3 awaiting a reply" color="blue" />
      </div>

      <div className={styles.dashboardGrid}>
        <section className={styles.contentCard}>
          <div className={styles.cardHeading}>
            <div><h2>Content</h2><span>{visiblePosts.length} of {posts.length} pieces</span></div>
            <button onClick={onNew}><Icon name="plus" /> Add new</button>
          </div>
          <div className={styles.filters}>
            <div className={styles.statusTabs}>
              {(["All", "Published", "Draft", "Scheduled"] as const).map((item) => (
                <button className={status === item ? styles.tabActive : ""} key={item} onClick={() => setStatus(item)}>{item}</button>
              ))}
            </div>
            <div className={styles.filterTools}>
              <label className={styles.searchBox}><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search content…" /></label>
              <label className={styles.selectBox}><Icon name="folder" /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevronDown" /></label>
              <label className={styles.selectBox}><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="updated">Latest</option><option value="title">Title</option><option value="tag">Tag</option><option value="category">Section</option></select><Icon name="chevronDown" /></label>
            </div>
          </div>

          <div className={styles.contentList}>
            <div className={styles.tableHeader}><span>Title</span><span>Status</span><span>Section</span><span>Updated</span><span /></div>
            {visiblePosts.map((post) => (
              <button className={styles.postRow} key={post.id} onClick={() => onEdit(post)}>
                <span className={`${styles.postThumb} ${styles.thumbContent}`}>
                  {post.coverImage ? <img src={post.coverImage} alt="" /> : <Icon name="layout" />}
                </span>
                <span className={styles.postTitle}><strong>{post.title || "Untitled note"}</strong><small>{post.description || "No description yet"}</small><em>{post.tags.slice(0, 2).map((tag) => `#${tag}`).join("  ")}</em></span>
                <span className={`${styles.statusBadge} ${statusClass(post.status)}`}><i />{post.status}</span>
                <span className={styles.typeCell}>{post.category}</span>
                <span className={styles.dateCell}>{relativeDate(post.updatedAt)}</span>
                <span className={styles.rowMore}><Icon name="more" /></span>
              </button>
            ))}
            {!visiblePosts.length ? (
              <div className={styles.noResults}><Icon name="search" /><strong>Nothing found</strong><span>Try another search or filter.</span></div>
            ) : null}
          </div>
        </section>

        <aside className={styles.activityCard}>
          <div className={styles.cardHeading}><div><h2>Activity</h2><span>Your garden, lately</span></div></div>
          <div className={styles.activityList}>
            {activity.slice(0, 5).map((item) => (
              <div className={styles.activityItem} key={item.id}>
                <span className={`${styles.activityIcon} ${styles[`activity${item.kind}`]}`}><Icon name={item.kind === "publish" ? "check" : item.kind === "comment" ? "comment" : item.kind === "subscriber" ? "mail" : "edit"} /></span>
                <div><strong>{item.action}</strong><p>{item.detail}</p><span>{item.time}</span></div>
              </div>
            ))}
          </div>
          <button className={styles.textButton}>View full timeline <span>→</span></button>
        </aside>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, detail, color }: { icon: IconName; label: string; value: number; detail: string; color: string }) {
  return (
    <article className={styles.statCard}>
      <span className={`${styles.statIcon} ${styles[color]}`}><Icon name={icon} /></span>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function PostEditor({
  initialPost,
  isNew,
  onBack,
  onDelete,
  onSave,
  onToast,
  categories,
}: {
  initialPost: GardenPost;
  isNew: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
  onSave: (post: GardenPost, message: string) => Promise<void>;
  onToast: (message: string) => void;
  categories: string[];
}) {
  const [post, setPost] = useState(initialPost);
  const [preview, setPreview] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const setField = <K extends keyof GardenPost>(field: K, value: GardenPost[K]) => {
    setPost((current) => ({ ...current, [field]: value }));
  };

  const updateTitle = (title: string) => {
    setPost((current) => ({
      ...current,
      title,
      slug: !current.slug || current.slug === slugify(current.title) ? slugify(title) : current.slug,
      seoTitle: !current.seoTitle || current.seoTitle === current.title ? title : current.seoTitle,
    }));
  };

  const persist = async (status: PostStatus) => {
    const now = new Date();
    const label = status === "Published" ? "Published version" : "Saved draft";
    const nextPost: GardenPost = {
      ...post,
      title: post.title.trim() || "Untitled note",
      slug: post.slug.trim() || slugify(post.title || "untitled-note"),
      seoTitle: post.seoTitle.trim() || post.title.trim(),
      seoDescription: post.seoDescription.trim() || post.description.trim(),
      status,
      updatedAt: now.toISOString(),
      publishedAt: status === "Published" ? post.publishedAt || now.toISOString() : post.publishedAt,
      versions: [
        { id: `version-${Date.now()}`, label, date: now.toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) },
        ...post.versions,
      ],
    };
    try {
      await onSave(nextPost, status === "Published" ? "Post published to your garden" : "Draft saved");
      setPost(nextPost);
    } catch {
      // The parent shows a useful storage error and leaves the editor untouched.
    }
  };

  const applyMarkdown = (before: string, after = before) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = post.content.slice(start, end) || "text";
    const next = `${post.content.slice(0, start)}${before}${selected}${after}${post.content.slice(end)}`;
    setField("content", next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const addTag = () => {
    const next = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (next && !post.tags.includes(next)) setField("tags", [...post.tags, next]);
    setTagInput("");
  };

  const uploadImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setField("coverImage", String(reader.result));
      onToast("Cover image added");
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    uploadImage(event.dataTransfer.files[0]);
  };

  const uploadGallery = (files?: FileList | File[]) => {
    if (!files?.length) return;
    const validFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"));
    if (!validFiles.length) {
      onToast("Choose image files");
      return;
    }
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPost((current) => ({
        ...current,
        gallery: [...(current.gallery || []), String(reader.result)],
      }));
      reader.readAsDataURL(file);
    });
    onToast(`${validFiles.length} ${validFiles.length === 1 ? "photo" : "photos"} added`);
  };

  const contentPlaceholder = "Write anything: a note, captions, context, useful links, or the story behind it…";

  return (
    <div className={styles.editorPage}>
      <div className={styles.editorTop}>
        <button className={styles.backButton} onClick={onBack}>← <span>Back to content</span></button>
        <div className={styles.saveState}><span /><span>Changes are saved locally</span></div>
        <div className={styles.editorActions}>
          <button className={styles.secondaryButton} onClick={() => setPreview(true)}><Icon name="eye" />Preview</button>
          <button className={styles.secondaryButton} onClick={() => void persist("Draft")}>Save draft</button>
          {post.status === "Published" ? (
            <button className={styles.primaryButton} onClick={() => void persist("Draft")}>Unpublish</button>
          ) : (
            <button className={styles.primaryButton} onClick={() => void persist("Published")}><Icon name="check" />Publish</button>
          )}
        </div>
      </div>

      <div className={styles.editorGrid}>
        <section className={styles.editorMain}>
          <p className={styles.editorEyebrow}>{isNew ? "A new seed" : "Editing content"}</p>
          <textarea className={styles.titleInput} value={post.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Your title…" rows={2} />
          <textarea className={styles.descriptionInput} value={post.description} onChange={(event) => setField("description", event.target.value)} placeholder="Write a short description that invites people in…" rows={2} />

          <div className={styles.formatField}>
            <span><Icon name="video" /></span>
            <label><strong>Video</strong><small>Optional · YouTube, Vimeo, or a direct video URL</small><input type="url" value={post.videoUrl || ""} onChange={(event) => setField("videoUrl", event.target.value)} placeholder="https://youtube.com/watch?v=…" /></label>
          </div>

          <div className={styles.formatField}>
            <span><Icon name="link" /></span>
            <label><strong>Featured link</strong><small>Optional · a page, project, route, or resource</small><input type="url" value={post.externalUrl || ""} onChange={(event) => setField("externalUrl", event.target.value)} placeholder="https://…" /></label>
          </div>

          <div className={styles.galleryEditor}>
            <div className={styles.galleryHeading}><div><strong>Photos</strong><small>Add as many images as you need</small></div><button className={styles.secondaryButton} onClick={() => galleryInput.current?.click()}><Icon name="plus" />Add photos</button></div>
            <div className={styles.galleryGrid}>
              {(post.gallery || []).map((image, index) => (
                <span key={`${image.slice(0, 24)}-${index}`}><img src={image} alt={`Gallery photo ${index + 1}`} /><button aria-label={`Remove photo ${index + 1}`} onClick={() => setField("gallery", (post.gallery || []).filter((_, imageIndex) => imageIndex !== index))}><Icon name="x" /></button></span>
              ))}
              {!(post.gallery || []).length ? <button className={styles.emptyGallery} onClick={() => galleryInput.current?.click()}><Icon name="image" /><strong>Add your photos</strong><small>Choose one image or a whole set</small></button> : null}
            </div>
            <input hidden multiple ref={galleryInput} type="file" accept="image/*" onChange={(event) => uploadGallery(event.target.files || undefined)} />
          </div>

          <div className={styles.editorBox}>
            <div className={styles.editorToolbar}>
              <button onClick={() => applyMarkdown("**")} title="Bold"><b>B</b></button>
              <button onClick={() => applyMarkdown("_")} title="Italic"><i>I</i></button>
              <button onClick={() => applyMarkdown("## ", "")} title="Heading">H2</button>
              <span />
              <button onClick={() => applyMarkdown("- ", "")} title="Bulleted list">• List</button>
              <button onClick={() => applyMarkdown("> ", "")} title="Quote">❝</button>
              <button onClick={() => applyMarkdown("[", "](https://)")} title="Link"><Icon name="link" /></button>
              <button onClick={() => galleryInput.current?.click()} title="Image"><Icon name="image" /></button>
              <small>Markdown</small>
            </div>
            <textarea ref={contentRef} value={post.content} onChange={(event) => setField("content", event.target.value)} placeholder={contentPlaceholder} />
            <div className={styles.editorMeta}><span>{post.content.trim().split(/\s+/).filter(Boolean).length} words</span><span>Markdown supported</span></div>
          </div>
        </section>

        <aside className={styles.editorSidebar}>
          <EditorPanel title="Publishing" defaultOpen>
            <Field label="Status"><span className={`${styles.statusBadge} ${statusClass(post.status)}`}><i />{post.status}</span></Field>
            <Field label="Publish date"><input type="datetime-local" value={post.publishedAt ? post.publishedAt.slice(0, 16) : ""} onChange={(event) => setField("publishedAt", event.target.value ? new Date(event.target.value).toISOString() : "")} /></Field>
          </EditorPanel>

          <EditorPanel title="Organization" defaultOpen>
            <Field label="Website section"><select value={post.category} onChange={(event) => setField("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Tags">
              <div className={styles.tagEditor}>
                {post.tags.map((tag) => <span key={tag}>#{tag}<button onClick={() => setField("tags", post.tags.filter((item) => item !== tag))} aria-label={`Remove ${tag}`}><Icon name="x" /></button></span>)}
                <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onBlur={addTag} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} placeholder="Add a tag" />
              </div>
            </Field>
          </EditorPanel>

          <EditorPanel title="Cover image" defaultOpen>
            <div className={`${styles.dropzone} ${dragging ? styles.dragging : ""} ${post.coverImage ? styles.hasImage : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => fileInput.current?.click()}>
              {post.coverImage ? <><img src={post.coverImage} alt="Cover preview" /><button onClick={(event) => { event.stopPropagation(); setField("coverImage", ""); }}><Icon name="trash" /> Remove</button></> : <><span><Icon name="upload" /></span><strong>Drop an image here</strong><small>or click to browse</small></>}
            </div>
            <input hidden ref={fileInput} type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => uploadImage(event.target.files?.[0])} />
          </EditorPanel>

          <EditorPanel title="Permalink & SEO">
            <Field label="Slug"><div className={styles.slugField}><span>/{slugifySetting(post.category)}/</span><input value={post.slug} onChange={(event) => setField("slug", slugify(event.target.value))} /></div></Field>
            <Field label="SEO title"><input value={post.seoTitle} maxLength={60} onChange={(event) => setField("seoTitle", event.target.value)} /><small>{post.seoTitle.length}/60</small></Field>
            <Field label="Meta description"><textarea value={post.seoDescription} maxLength={160} onChange={(event) => setField("seoDescription", event.target.value)} rows={3} /><small>{post.seoDescription.length}/160</small></Field>
          </EditorPanel>

          {!isNew ? (
            <EditorPanel title="Engagement">
              <div className={styles.engagementGrid}>
                <span><Icon name="heart" /><strong>{post.likes}</strong><small>Likes</small></span>
                <span><Icon name="bookmark" /><strong>{post.bookmarks}</strong><small>Bookmarks</small></span>
                <span><Icon name="comment" /><strong>{post.comments}</strong><small>Comments</small></span>
              </div>
            </EditorPanel>
          ) : null}

          <button className={styles.historyButton} onClick={() => setShowHistory(!showHistory)}><Icon name="clock" /><span>Version history</span><b>{post.versions.length}</b><Icon name="chevronDown" /></button>
          {showHistory ? <div className={styles.historyList}>{post.versions.length ? post.versions.map((version) => <div key={version.id}><i /><span><strong>{version.label}</strong><small>{version.date}</small></span></div>) : <p>Your saved versions will appear here.</p>}</div> : null}
          {!isNew ? <button className={styles.deleteButton} onClick={() => setShowDelete(true)}><Icon name="trash" />Delete post</button> : null}
        </aside>
      </div>

      {preview ? <PreviewModal post={post} onClose={() => setPreview(false)} /> : null}
      {showDelete ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setShowDelete(false)}>
          <div className={styles.confirmModal} onMouseDown={(event) => event.stopPropagation()}>
            <span className={styles.dangerIcon}><Icon name="trash" /></span>
            <h2>Delete this post?</h2>
            <p>“{post.title || "Untitled note"}” will be removed from this browser. This can’t be undone.</p>
            <div><button className={styles.secondaryButton} onClick={() => setShowDelete(false)}>Keep post</button><button className={styles.dangerButton} onClick={() => onDelete(post.id)}>Delete</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SiteStructurePanel({
  posts,
  settings,
  onSave,
}: {
  posts: GardenPost[];
  settings: GardenSettings;
  onSave: (settings: GardenSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  const updateCategory = (id: string, field: "label" | "slug", value: string) => {
    setDraft((current) => ({
      ...current,
      categories: current.categories.map((category) => {
        if (category.id !== id) return category;
        if (field === "label") {
          const shouldFollowLabel = category.slug === slugifySetting(category.label);
          return { ...category, label: value, slug: shouldFollowLabel ? slugifySetting(value) : category.slug };
        }
        return { ...category, slug: slugifySetting(value) };
      }),
    }));
  };

  const addCategory = () => {
    const number = draft.categories.length + 1;
    setDraft((current) => ({
      ...current,
      categories: [...current.categories, { id: `category-${Date.now()}`, label: `New section ${number}`, slug: `new-section-${number}` }],
    }));
  };

  const removeCategory = (id: string) => {
    setDraft((current) => ({ ...current, categories: current.categories.filter((category) => category.id !== id) }));
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.categories.length) return;
    setDraft((current) => {
      const categories = [...current.categories];
      [categories[index], categories[target]] = [categories[target], categories[index]];
      return { ...current, categories };
    });
  };

  return (
    <>
      <div className={styles.pageHeading}>
        <div><p className={styles.kicker}>Your garden map</p><h1>Site structure</h1><span>Rename your header and decide which sections appear across the site.</span></div>
        <button className={styles.primaryButton} onClick={() => onSave(draft)}><Icon name="check" />Save changes</button>
      </div>

      <div className={styles.structureGrid}>
        <section className={styles.structureCard}>
          <div className={styles.cardHeading}><div><h2>Header</h2><span>The name shown first in your website navigation</span></div></div>
          <div className={styles.structureBody}>
            <Field label="Header name"><input value={draft.headerName} maxLength={32} onChange={(event) => setDraft((current) => ({ ...current, headerName: event.target.value }))} placeholder="Shayan" /></Field>
            <div className={styles.headerPreview}>
              <small>Live preview</small>
              <nav><strong>{draft.headerName || "Your name"}</strong>{draft.categories.map((category) => <span key={category.id}>{category.label || "Untitled"}</span>)}</nav>
            </div>
          </div>
        </section>

        <section className={styles.structureCard}>
          <div className={styles.cardHeading}><div><h2>Website sections</h2><span>These become categories in the editor and links in your header</span></div><button onClick={addCategory}><Icon name="plus" /> Add section</button></div>
          <div className={styles.categoryManager}>
            {draft.categories.map((category, index) => {
              const usage = posts.filter((post) => post.category === settings.categories.find((item) => item.id === category.id)?.label).length;
              return (
                <article key={category.id}>
                  <span className={styles.categoryIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <label><small>Name</small><input value={category.label} onChange={(event) => updateCategory(category.id, "label", event.target.value)} /></label>
                  <label><small>URL</small><div><span>/</span><input value={category.slug} onChange={(event) => updateCategory(category.id, "slug", event.target.value)} /></div></label>
                  <span className={styles.usageBadge}>{usage} {usage === 1 ? "item" : "items"}</span>
                  <div className={styles.categoryActions}>
                    <button disabled={index === 0} aria-label={`Move ${category.label} up`} onClick={() => moveCategory(index, -1)}>↑</button>
                    <button disabled={index === draft.categories.length - 1} aria-label={`Move ${category.label} down`} onClick={() => moveCategory(index, 1)}>↓</button>
                    <button disabled={usage > 0 || draft.categories.length === 1} title={usage > 0 ? "Move its content before deleting this section" : "Delete section"} aria-label={`Delete ${category.label}`} onClick={() => removeCategory(category.id)}><Icon name="trash" /></button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className={styles.structureHint}><Icon name="sparkles" />Renaming a section also updates the content assigned to it. A section with content can’t be deleted until its items are moved.</p>
        </section>
      </div>
    </>
  );
}

function EditorPanel({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={styles.editorPanel}>
      <button className={styles.panelToggle} onClick={() => setOpen(!open)}><strong>{title}</strong><Icon className={open ? styles.rotated : ""} name="chevronDown" /></button>
      {open ? <div className={styles.panelContent}>{children}</div> : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}

function PreviewModal({ post, onClose }: { post: GardenPost; onClose: () => void }) {
  return (
    <div className={styles.previewOverlay}>
      <div className={styles.previewTop}><span><i />Preview mode</span><button onClick={onClose}><Icon name="x" />Close preview</button></div>
      <article className={styles.previewArticle}>
        {post.coverImage ? <img className={styles.previewCover} src={post.coverImage} alt="" /> : <div className={`${styles.previewCoverPlaceholder} ${styles.thumbContent}`}><Icon name="layout" /></div>}
        <div className={styles.previewInner}>
          <p className={styles.previewMeta}>{post.category} · {formatDate(post.publishedAt || new Date().toISOString())}</p>
          <h1>{post.title || "Untitled note"}</h1>
          <p className={styles.previewDescription}>{post.description}</p>
          <div className={styles.previewTags}>{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          {post.videoUrl ? <a className={styles.previewMediaLink} href={post.videoUrl} target="_blank" rel="noreferrer"><span><Icon name="video" /></span><div><small>Featured video</small><strong>Watch the video</strong><em>{post.videoUrl}</em></div><b>↗</b></a> : null}
          {post.externalUrl ? <a className={styles.previewMediaLink} href={post.externalUrl} target="_blank" rel="noreferrer"><span><Icon name="link" /></span><div><small>Featured link</small><strong>Open the shared link</strong><em>{post.externalUrl}</em></div><b>↗</b></a> : null}
          {(post.gallery || []).length ? <div className={styles.previewGallery}>{(post.gallery || []).map((image, index) => <img src={image} alt={`Gallery photo ${index + 1}`} key={`${image.slice(0, 24)}-${index}`} />)}</div> : null}
          <MarkdownPreview content={post.content || "Your story will appear here."} />
        </div>
      </article>
    </div>
  );
}

function ArchivePanel({ posts, onEdit }: { posts: GardenPost[]; onEdit: (post: GardenPost) => void }) {
  const grouped = posts.reduce<Record<string, GardenPost[]>>((acc, post) => {
    const year = new Date(post.publishedAt || post.updatedAt).getFullYear().toString();
    acc[year] = [...(acc[year] || []), post];
    return acc;
  }, {});
  return (
    <>
      <div className={styles.pageHeading}><div><p className={styles.kicker}>Everything, over time</p><h1>Archive</h1><span>A complete, chronological view of your garden.</span></div></div>
      <section className={styles.archiveCard}>
        {Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a)).map(([year, yearPosts]) => (
          <div className={styles.archiveYear} key={year}>
            <div><strong>{year}</strong><span>{yearPosts.length} pieces</span></div>
            <div>{yearPosts.map((post) => <button key={post.id} onClick={() => onEdit(post)}><time>{new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(post.publishedAt || post.updatedAt))}</time><span><strong>{post.title}</strong><small>{post.category}</small></span><span className={`${styles.statusBadge} ${statusClass(post.status)}`}><i />{post.status}</span><b>→</b></button>)}</div>
          </div>
        ))}
      </section>
    </>
  );
}

function MediaPanel({ media, posts, onMedia, onToast }: { media: string[]; posts: GardenPost[]; onMedia: (media: string[]) => void; onToast: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const images = [...media, ...posts.flatMap((post) => [post.coverImage, ...(post.gallery || [])]).filter(Boolean)];
  const addMedia = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) { onToast("Choose an image file"); return; }
    const reader = new FileReader();
    reader.onload = () => { onMedia([String(reader.result), ...media]); onToast("Image added to your library"); };
    reader.readAsDataURL(file);
  };
  return (
    <>
      <div className={styles.pageHeading}><div><p className={styles.kicker}>Photos & illustrations</p><h1>Media library</h1><span>Keep the visual pieces of your garden in one place.</span></div><button className={styles.primaryButton} onClick={() => input.current?.click()}><Icon name="upload" />Upload image</button></div>
      <input hidden ref={input} type="file" accept="image/*" onChange={(event) => addMedia(event.target.files?.[0])} />
      <section className={styles.mediaCard}>
        <div className={styles.mediaToolbar}><label className={styles.searchBox}><Icon name="search" /><input placeholder="Search media…" /></label><span>{images.length + 4} items</span></div>
        <div className={styles.mediaGrid}>
          <button className={styles.mediaUpload} onClick={() => input.current?.click()}><span><Icon name="upload" /></span><strong>Upload a new image</strong><small>PNG, JPG, GIF or WebP</small></button>
          {images.map((image, index) => <button className={styles.mediaItem} key={`${image.slice(0, 30)}-${index}`}><img src={image} alt={`Uploaded garden media ${index + 1}`} /><span>garden-image-{index + 1}.jpg</span></button>)}
          {["violet", "green", "amber", "blue"].map((color, index) => <button className={`${styles.mediaItem} ${styles[`media${color}`]}`} key={color}><span className={styles.generatedArt}><Icon name={index % 2 ? "bookmark" : "sparkles"} /></span><span>{["morning-light.jpg", "notes-cover.jpg", "workbench.jpg", "reading-list.jpg"][index]}</span></button>)}
        </div>
      </section>
    </>
  );
}

function CommentsPanel({ onToast }: { onToast: (message: string) => void }) {
  const [comments, setComments] = useState([
    { id: 1, author: "Mina", initials: "MN", text: "The idea of weather as ambience really stayed with me. Beautiful build.", post: "Little weather station", time: "5 hours ago", pending: true },
    { id: 2, author: "Arman", initials: "AR", text: "I’m trying the three-part rhythm this week. It already feels lighter.", post: "A quiet system for capturing ideas", time: "Yesterday", pending: true },
    { id: 3, author: "Leila", initials: "LK", text: "Would love to see the actual commonplace book setup in a future note.", post: "On keeping a commonplace book", time: "2 days ago", pending: false },
  ]);
  const remove = (id: number) => { setComments((current) => current.filter((comment) => comment.id !== id)); onToast("Comment removed"); };
  const approve = (id: number) => { setComments((current) => current.map((comment) => comment.id === id ? { ...comment, pending: false } : comment)); onToast("Comment approved"); };
  return (
    <>
      <div className={styles.pageHeading}><div><p className={styles.kicker}>Garden conversations</p><h1>Comments</h1><span>Read, reply, and keep the conversation thoughtful.</span></div></div>
      <section className={styles.commentsCard}>
        <div className={styles.cardHeading}><div><h2>Recent comments</h2><span>{comments.filter((comment) => comment.pending).length} awaiting moderation</span></div></div>
        {comments.map((comment) => <article className={styles.commentItem} key={comment.id}><span className={styles.commentAvatar}>{comment.initials}</span><div><div><strong>{comment.author}</strong><span>{comment.time}</span>{comment.pending ? <em>Pending</em> : <em className={styles.approved}>Approved</em>}</div><p>{comment.text}</p><small>On “{comment.post}”</small><footer>{comment.pending ? <button onClick={() => approve(comment.id)}><Icon name="check" />Approve</button> : <button onClick={() => onToast("Reply composer opened")}>Reply</button>}<button onClick={() => remove(comment.id)}><Icon name="trash" />Remove</button></footer></div></article>)}
      </section>
    </>
  );
}

function NewsletterPanel({ onToast }: { onToast: (message: string) => void }) {
  const [subject, setSubject] = useState("A few new things from the garden");
  const [message, setMessage] = useState("A short note for people who follow along with the garden…");
  return (
    <>
      <div className={styles.pageHeading}><div><p className={styles.kicker}>Stay in touch</p><h1>Newsletter</h1><span>Send a quiet update when something new has grown.</span></div></div>
      <div className={styles.newsletterGrid}>
        <section className={styles.newsletterCompose}>
          <div className={styles.cardHeading}><div><h2>Compose an update</h2><span>Sending to 284 subscribers</span></div><span className={styles.statusBadge + " " + styles.draft}><i />Draft</span></div>
          <Field label="Subject"><input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
          <Field label="Message"><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={9} /></Field>
          <label className={styles.includeLatest}><input type="checkbox" defaultChecked /><span><strong>Include latest published posts</strong><small>Add a small list of your three newest pieces.</small></span></label>
          <div className={styles.newsletterActions}><button className={styles.secondaryButton} onClick={() => onToast("Newsletter preview is ready") }><Icon name="eye" />Preview</button><button className={styles.primaryButton} onClick={() => onToast("Newsletter scheduled for tomorrow morning") }><Icon name="calendar" />Schedule</button></div>
        </section>
        <aside className={styles.audienceCard}><span className={styles.audienceIcon}><Icon name="mail" /></span><strong>284</strong><p>garden subscribers</p><div><span><b>+18</b> this month</span><span><b>62%</b> avg. open rate</span></div><small>Last letter sent Jul 22</small></aside>
      </div>
    </>
  );
}
