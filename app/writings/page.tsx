import { PageIntro } from "../components/page-intro";

const writings = [
  ["July 28, 2026", "A garden is a practice", "A note on keeping space for ideas before they are finished."],
  ["July 18, 2026", "Keeping a trail of interesting things", "Why a personal archive can be more useful than a perfect feed."],
  ["July 8, 2026", "Small systems, gentle momentum", "The value of systems that make it easy to return after a pause."],
];

export default function WritingsPage() {
  return (
    <PageIntro eyebrow="Notes and essays" title="Writing from the garden." description="Thoughts on making, learning, systems, and the details worth noticing.">
      <section className="writing-list" aria-label="Writings">
        {writings.map(([date, title, description]) => (
          <article className="writing-row" key={title}>
            <p className="date">{date}</p><div><h2>{title}</h2><p>{description}</p></div><span>Read →</span>
          </article>
        ))}
      </section>
    </PageIntro>
  );
}
