/* Uploaded section icons intentionally bypass Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import { starterPosts } from "../lib/garden-data";
import { gardenSettings } from "../lib/garden-config";
import { readGardenPosts, readGardenSettings } from "../lib/server-content";
import { ShelfLibrary } from "./shelf-library";
import styles from "./shelf-library.module.css";

export async function ShelfSection() {
  const settings = await readGardenSettings({ live: false }).then((result) => result.settings).catch(() => gardenSettings);
  const shelfSettings = settings.categories.find((category) => category.id === "category-shelf");
  const shelfName = shelfSettings?.label || "Shelf";
  const managedPosts = await readGardenPosts({ live: false }).then((result) => result.posts).catch(() => starterPosts);
  const shelfItems = managedPosts
    .filter((post) => post.status === "Published" && post.category === "Shelf")
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());

  return (
    <main className={`${styles.page} garden-shelf-page`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span>{String(shelfItems.length).padStart(2, "0")}</span> Things worth keeping close</p>
          <h1>My <em>{shelfName.toLowerCase()}.</em></h1>
          <p>Books, movies, shows, music, and games that have stayed with me—or are waiting for their turn.</p>
        </div>
        <div className={styles.shelfDoodle} aria-hidden="true">
          {shelfSettings?.iconImage ? <img src={shelfSettings.iconImage} alt="" /> : <><span>B</span><span>M</span><span>S</span><span>♫</span><span>G</span></>}
          <i />
        </div>
      </section>

      <ShelfLibrary items={shelfItems} />
    </main>
  );
}
