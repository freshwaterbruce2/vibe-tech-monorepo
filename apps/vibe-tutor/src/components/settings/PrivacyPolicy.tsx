import { useState } from 'react';

/**
 * Collapsible privacy policy shown in the Data Management settings area.
 * Content reflects how Vibe Tutor actually handles data: local-first storage,
 * an AI proxy, anonymous crash reporting, no ads, and no data sale. Written for
 * the Teens (13+) audience the app targets on the Play Store.
 */
const PrivacyPolicy = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 border-t border-[var(--border-color)] pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="text-sm font-semibold text-[var(--secondary-accent)] underline hover:opacity-80"
      >
        {open ? 'Hide Privacy Policy' : 'Privacy Policy'}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Privacy Policy"
          className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]"
        >
          <p>
            <strong>Who it&apos;s for.</strong> Vibe Tutor is intended for students aged 13 and
            older.
          </p>
          <p>
            <strong>What we store.</strong> Your homework, points, achievements, chat history, and
            preferences are stored locally on your device. There is no personal account or profile
            kept on our servers.
          </p>
          <p>
            <strong>AI features.</strong> When you use the AI Tutor or AI Buddy, your messages are
            sent through our backend to an AI model provider (OpenRouter / DeepSeek) only to generate
            a reply. Messages are not used to build a personal profile and are never sold.
          </p>
          <p>
            <strong>Safety.</strong> Chat includes an automatic safety check that responds to
            crisis-related language with trusted-adult and 988 (Suicide &amp; Crisis Lifeline)
            resources, independent of the AI model.
          </p>
          <p>
            <strong>Error reporting.</strong> We use anonymous crash and error diagnostics (Sentry)
            to fix bugs. These include device and error details, not your chat content.
          </p>
          <p>
            <strong>No ads, no data sale.</strong> Vibe Tutor shows no third-party advertising and
            does not sell your data.
          </p>
          <p>
            <strong>Parental controls.</strong> A parent can set screen-time limits and quiet hours
            and review activity from the parent area.
          </p>
          <p>
            <strong>Your control.</strong> You can export or permanently delete all app data at any
            time from this Data Management screen.
          </p>
          <p>
            <strong>Contact.</strong> Questions about privacy? Reach the developer at the support
            contact listed on the app&apos;s store page.
          </p>
        </div>
      )}
    </div>
  );
};

export default PrivacyPolicy;
