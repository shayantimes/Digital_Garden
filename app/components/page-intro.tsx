type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <main>
      <section className="inner-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="intro">{description}</p>}
      </section>
      {children}
    </main>
  );
}
