import PageLayout from '@/components/layout/PageLayout';

const Terms = () => {
  return (
    <PageLayout
      title="Terms of Service"
      description="Terms of service for Vibe-Tech.org product marketing, software services, and product demos."
      keywords="Vibe Tech terms, Vibe-Tech.org terms of service, software service terms"
    >
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-10 border border-aura-accent/20">
          <h1 className="text-4xl font-heading font-bold mb-6 bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">
            Terms of Service
          </h1>
          <p className="text-white/80 mb-8">Last updated: May 18, 2026</p>

          <div className="space-y-8 text-slate-200 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Use of the Site</h2>
              <p>
                Vibe-Tech.org provides information about Vibe Tech products, services, demos, and
                launch workflows. You may use this site to learn about available offers, request
                contact, review resources, and evaluate product demos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Product and Service Scope</h2>
              <p>
                Any software build, product launch, automation workflow, payment integration, or
                custom implementation is governed by the written scope agreed for that project.
                Website descriptions are informational and do not create a binding delivery
                commitment until a proposal or service agreement is accepted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Payments and Subscriptions</h2>
              <p>
                Pricing pages and product demos may describe launch support, subscriptions, or
                implementation options. Payment terms, cancellation terms, and included deliverables
                are confirmed during checkout or in the accepted project scope.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Acceptable Use</h2>
              <p>
                Do not misuse the site, attempt unauthorized access, interfere with service
                availability, submit unlawful content, or use demos in a way that harms other users,
                customers, systems, or infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Contact</h2>
              <p>
                For terms or service questions, contact Bruce Freshwater at
                freshwaterbruce@icloud.com or use the contact page on Vibe-Tech.org.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Terms;
