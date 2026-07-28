import { PageIntro } from "../components/page-intro";

export default function NowPage() {
  return (
    <PageIntro eyebrow="Right now" title="What I am tending to these days." description="An honest, occasional update about my current focus. Inspired by the idea of a “now” page.">
      <section className="now-page">
        <article><p className="eyebrow">Building</p><h2>This digital garden</h2><p>Giving my work, notes, and interests a calm place to grow in public.</p></article>
        <article><p className="eyebrow">Learning</p><h2>How to make more room for curiosity</h2><p>Practising smaller, more sustainable ways to follow ideas and share what I find.</p></article>
        <article><p className="eyebrow">Last updated</p><h2>July 2026</h2><p>This is a living page. I will update it whenever my attention shifts.</p></article>
      </section>
    </PageIntro>
  );
}
