import { PageIntro } from "../components/page-intro";

const hobbies = [
  ["01", "Reading", "Keeping a living list of books, essays, and ideas to return to."],
  ["02", "Collecting", "Small objects, photographs, textures, and references that catch my eye."],
  ["03", "Learning", "Following curious threads without needing them to become a project."],
];

export default function HobbiesPage() {
  return (
    <PageIntro eyebrow="Off the clock" title="Things I make time for." description="A changing collection of interests, inspirations, and enjoyable rabbit holes.">
      <section className="hobby-grid" aria-label="Hobbies">
        {hobbies.map(([number, title, description]) => (
          <article className="hobby-card" key={title}><span>{number}</span><h2>{title}</h2><p>{description}</p><b>Explore →</b></article>
        ))}
      </section>
    </PageIntro>
  );
}
