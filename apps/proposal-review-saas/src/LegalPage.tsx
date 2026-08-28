interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <main className="legal-shell">
      <div className="legal-card">
        <div className="section-badge">Factory legal stub</div>
        <h1>{title}</h1>
        <p>{intro}</p>
        {sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <div className="tool-footer-links">
          <a href="/">Back to app</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </main>
  );
}
