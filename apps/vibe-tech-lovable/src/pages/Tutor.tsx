import PageLayout from '@/components/layout/PageLayout';

const Tutor = () => {
  return (
    <PageLayout
      title="Vibe Tutor"
      description="Parent pays. Teen uses. It stays on the problem. It does not write the essay."
      keywords="Vibe Tutor, homework, Google Play, teens"
    >
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-10 border border-aura-accent/20">
          <h1 className="text-4xl font-heading font-bold mb-6 bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">
            Vibe Tutor
          </h1>
          <p className="text-white text-xl mb-4">Parent pays. Teen uses.</p>
          <div className="space-y-6 text-slate-200 leading-relaxed">
            <p>It stays on the problem. It does not write the essay.</p>
            <p>
              Homework at 11pm: it walks the next step with your teen instead of handing over the
              answer. Ages 13–17. One-time $2.99. No ads. No in-app purchases. United States.
            </p>
            <p>
              <a
                href="https://play.google.com/store/apps/details?id=com.vibetech.tutor"
                className="text-aura-accent hover:underline"
              >
                Get it on Google Play
              </a>
            </p>
            <p>
              <a
                href="https://vibe-tech-publications.beehiiv.com/subscribe"
                className="text-aura-accent hover:underline"
              >
                Get updates
              </a>
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Tutor;
