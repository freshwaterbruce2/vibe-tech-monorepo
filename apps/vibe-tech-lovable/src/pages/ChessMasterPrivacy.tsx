import PageLayout from '@/components/layout/PageLayout';

const ChessMasterPrivacy = () => {
  return (
    <PageLayout
      title="Chess Master Privacy Policy"
      description="Privacy policy for Chess Master by Vibe Tech LLC. Local chess with on-device Puzzle Coach and Lessons. No accounts, no ads, no hosted matches."
      keywords="Chess Master privacy policy, com.vibetech.chessmaster, Vibe Tech LLC chess privacy"
    >
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-10 border border-aura-accent/20">
          <h1 className="text-4xl font-heading font-bold mb-6 bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">
            Chess Master Privacy Policy
          </h1>
          <p className="text-white/80 mb-8">Last updated: August 29, 2026</p>

          <div className="space-y-8 text-slate-200 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">About Chess Master</h2>
              <p>
                Chess Master (package name com.vibetech.chessmaster) is a local chess app published
                by Vibe Tech LLC. This policy describes how Chess Master handles information. It
                applies to the Chess Master app, not to the Vibe-Tech.org marketing site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Information We Collect</h2>
              <p>
                Chess Master does not require an account and does not collect personal information
                such as your name, email address, or phone number. Play, Puzzle Coach, and Lessons
                run on your device. Game progress and similar app data stay on the device unless
                you back up or share them yourself through your own device tools.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Puzzle Coach and Lessons</h2>
              <p>
                Puzzle Coach and Lessons are on-device features. They do not send your games,
                puzzle attempts, or lesson progress to Vibe Tech LLC servers for hosting or
                analysis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">What Chess Master Does Not Do</h2>
              <p>
                Chess Master does not create user accounts, show ads, host online matches, or offer
                in-app purchases. Matches are local. We do not sell your information because the
                app is not built to collect it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Contact</h2>
              <p>
                For Chess Master privacy questions, contact Bruce Freshwater at
                Bfreshwater@vibe-tech.org or Vibe Tech LLC through the contact form on
                Vibe-Tech.org.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default ChessMasterPrivacy;