import PageLayout from '@/components/layout/PageLayout';

const Privacy = () => {
  return (
    <PageLayout
      title="Privacy Policy"
      description="Privacy policy for Vibe-Tech.org product marketing, lead capture, and business automation services."
      keywords="Vibe Tech privacy policy, Vibe-Tech.org privacy, product marketing privacy"
    >
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-10 border border-aura-accent/20">
          <h1 className="text-4xl font-heading font-bold mb-6 bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">
            Privacy Policy
          </h1>
          <p className="text-white/80 mb-8">Last updated: May 18, 2026</p>

          <div className="space-y-8 text-slate-200 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Information We Collect</h2>
              <p>
                Vibe Tech collects information you choose to provide through contact forms, quote
                requests, newsletter forms, demo requests, and product interest workflows. This may
                include your name, email address, phone number, company, project goals, and selected
                service interests.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">How We Use Information</h2>
              <p>
                We use submitted information to respond to inquiries, qualify product or service
                requests, improve Vibe-Tech.org, plan launches for the project suite, and operate
                related business workflows such as Vibe Tutor, Chessmaster Academy, Proposal
                Review, Clinic Autopilot, and Invoice Automation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Third-Party Services</h2>
              <p>
                The site may rely on infrastructure and service providers such as hosting,
                analytics, email, payment, and backend platforms. Those providers process information
                only as needed to deliver the requested site or product functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Data Retention</h2>
              <p>
                We keep lead and project information only as long as reasonably needed for business
                follow-up, support, legal compliance, or service improvement. You may request that we
                delete or correct your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Contact</h2>
              <p>
                For privacy questions, contact Bruce Freshwater at freshwaterbruce@icloud.com or use
                the contact form on Vibe-Tech.org.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Privacy;
