import { PageIntro } from "../components/page-intro";

const projects = [
  ["01", "Digital Garden", "An evolving home for notes, projects, and useful fragments.", "2026"],
  ["02", "Next project", "A place to introduce something you are building next.", "In progress"],
  ["03", "Archive", "A collection of previous experiments worth keeping nearby.", "Soon"],
];

export default function ProjectsPage() {
  return (
    <PageIntro eyebrow="Selected work" title="Projects, experiments, and things in motion." description="A small shelf for the work I am making and the ideas I am testing.">
      <section className="list-page" aria-label="Projects">
        {projects.map(([number, title, description, status]) => (
          <article className="project-row" key={title}>
            <span>{number}</span><div><h2>{title}</h2><p>{description}</p></div><em>{status}</em><b>↗</b>
          </article>
        ))}
      </section>
    </PageIntro>
  );
}
