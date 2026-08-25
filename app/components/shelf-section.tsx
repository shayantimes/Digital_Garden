import { starterPosts } from "../lib/garden-data";
import { readGardenPosts } from "../lib/server-content";
import { ShelfLibrary } from "./shelf-library";
import styles from "./shelf-library.module.css";

export async function ShelfSection() {
  const managedPosts = await readGardenPosts({ live: false }).then((result) => result.posts).catch(() => starterPosts);
  const shelfItems = managedPosts
    .filter((post) => post.status === "Published" && post.category === "Shelf")
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span>{String(shelfItems.length).padStart(2, "0")}</span> Things worth keeping close</p>
          <h1>My <em>shelf.</em></h1>
          <p>Books, movies, shows, music, and games that have stayed with me—or are waiting for their turn.</p>
        </div>
        <div className={styles.shelfDoodle} aria-hidden="true">
          <span>B</span><span>M</span><span>S</span><span>♫</span><span>G</span>
          <i />
        </div>
      </section>

      <ShelfLibrary items={shelfItems} />
    </main>
  );
}
