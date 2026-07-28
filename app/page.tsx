const notes = [
  {
    date: "July 28, 2026",
    title: "A garden is a practice",
    excerpt:
      "This is a place for ideas before they are finished: notes to return to, questions worth holding, and small discoveries that deserve a little more light.",
    tags: ["welcome", "thinking"],
  },
  {
    date: "July 18, 2026",
    title: "Keeping a trail of interesting things",
    excerpt:
      "A personal site does not need to be a perfect archive. It can be a trail—useful because it records where your attention has been.",
    tags: ["notes", "digital garden"],
  },
  {
    date: "July 8, 2026",
    title: "Small systems, gentle momentum",
    excerpt:
      "The most durable systems are often the ones that make it easy to begin again after a pause.",
    tags: ["systems", "work"],
  },
];

const projects = [
  { name: "Now", description: "What I am focused on and learning lately." },
  { name: "Library", description: "Books, articles, tools, and references I return to." },
  { name: "Colophon", description: "A few notes on how this site is made." },
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <p className="eyebrow">Digital garden · Est. 2026</p>
        <h1>A home for ideas<br />that are still growing.</h1>
        <p className="intro">
          I collect thoughts on making, learning, and the small things that make a life feel more considered.
        </p>
        <a className="text-link" href="#notes">Browse the garden <span>↓</span></a>
        <div className="sun" aria-hidden="true"><span /></div>
      </section>

      <section className="notes-section" id="notes" aria-labelledby="notes-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent notes</p>
            <h2 id="notes-heading">Fresh from the garden</h2>
          </div>
          <a className="text-link desktop-link" href="/writings">All writings <span>→</span></a>
        </div>
        <div className="note-grid">
          {notes.map((note, index) => (
            <article className={`note-card note-${index + 1}`} key={note.title}>
              <p className="date">{note.date}</p>
              <h3>{note.title}</h3>
              <p>{note.excerpt}</p>
              <div className="tags">
                {note.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-copy">
          <p className="eyebrow">A little about this place</p>
          <h2>Not a portfolio.<br />More like a windowsill.</h2>
          <p>
            Some things here are polished; others are unfinished on purpose. This garden is a public record of what I am tending to—ideas, work, references, and the occasional useful question.
          </p>
          <a className="text-link" href="mailto:hello@example.com">Say hello <span>↗</span></a>
        </div>
        <div className="plant-illustration" aria-hidden="true">
          <div className="pot" />
          <div className="stem stem-one" /><div className="stem stem-two" /><div className="stem stem-three" />
          <i className="leaf leaf-one" /><i className="leaf leaf-two" /><i className="leaf leaf-three" /><i className="leaf leaf-four" /><i className="leaf leaf-five" />
        </div>
      </section>

      <section className="paths" id="projects" aria-labelledby="paths-heading">
        <p className="eyebrow">Other paths</p>
        <h2 id="paths-heading">A few places to wander</h2>
        <div className="path-list">
          {projects.map((project, index) => (
            <a href={index === 0 ? "/now" : index === 1 ? "/writings" : "/projects"} className="path" key={project.name}>
              <span>0{index + 1}</span><strong>{project.name}</strong><p>{project.description}</p><b>→</b>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <span>Planted and tended by Shayan.</span>
        <span>Made in Tehran</span>
      </footer>
    </main>
  );
}
