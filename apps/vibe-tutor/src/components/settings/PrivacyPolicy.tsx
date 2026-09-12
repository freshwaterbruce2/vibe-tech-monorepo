import { useState } from 'react';
import policy from '../../../privacy-policy.json';

/** Renders the release-owned policy data so the in-app wording cannot drift. */
const PrivacyPolicy = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border-t border-[var(--border-color)] pt-4">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="text-sm font-semibold text-[var(--secondary-accent)] underline hover:opacity-80">
        {open ? 'Hide Privacy Policy' : 'Privacy Policy'}
      </button>
      {open && (
        <div role="region" aria-label="Privacy Policy" className="mt-3 space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{policy.title}</h2>
          <p>Effective {policy.effectiveDate}</p>
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="font-semibold text-[var(--text-primary)]">{section.heading}</h3>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-1">{paragraph}</p>)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
export default PrivacyPolicy;
