type ContentSection = {
  title: string;
  body: string;
};

export function StaticContentPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ContentSection[];
}) {
  return (
    <main className="static-content-page">
      <section className="static-content-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </section>

      <section className="static-content-body">
        {sections.map((section) => (
          <article key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
