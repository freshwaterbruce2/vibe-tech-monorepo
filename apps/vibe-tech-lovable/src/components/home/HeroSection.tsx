const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-12 sm:pt-28 sm:pb-16">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Company Header */}
        <div
          className="mb-12 p-8 text-center"
          style={{
            background: 'var(--vibe-glass-rgba)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--vibe-glass-border)',
            boxShadow: '0 0 30px rgba(0, 242, 255, 0.3), 0 8px 32px 0 rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
          }}
        >
          <h1
            className="mb-4 font-heading text-4xl font-light text-white sm:text-5xl md:text-6xl"
            style={{
              letterSpacing: 'var(--vibe-letter-spacing-wide)',
              textShadow: '0 0 20px rgba(0, 242, 255, 0.5)',
            }}
          >
            Vibe Tech <span style={{ color: 'var(--vibe-neon-cyan)' }}>LLC</span>
          </h1>
          <p className="font-body text-base text-gray-300 sm:text-lg">
            by Bruce Freshwater
          </p>
          <p className="mt-4 font-body text-lg text-white sm:text-xl">
            We ship apps. Two are on Google Play.
          </p>
        </div>

        {/* Product Cards */}
        <div className="mb-12 grid gap-8 md:grid-cols-2">
          {/* Vibe Tutor */}
          <div
            className="p-6"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h2
              className="mb-3 font-heading text-2xl font-light text-white"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              Vibe Tutor
            </h2>
            <p className="mb-2 font-body text-sm text-gray-400">
              Google Play · United States · Ages 13–17 · $2.99
            </p>
            <div className="mb-4 space-y-2 font-body text-base text-white">
              <p>Parent pays. Teen uses.</p>
              <p>It stays on the problem. It does not write the essay.</p>
              <p className="text-gray-300">
                Homework at 11pm: it walks the next step with your teen instead of handing over the answer.
              </p>
            </div>
            <a
              href="/tutor"
              className="inline-block rounded px-6 py-2 font-body text-sm transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--vibe-neon-cyan), var(--vibe-neon-purple))',
                color: 'white',
                boxShadow: '0 0 15px rgba(0, 242, 255, 0.4)',
              }}
            >
              Learn More
            </a>
          </div>

          {/* Chess Master */}
          <div
            className="p-6"
            style={{
              background: 'var(--vibe-glass-rgba)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--vibe-glass-border)',
              boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h2
              className="mb-3 font-heading text-2xl font-light text-white"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              Chess Master
            </h2>
            <p className="mb-2 font-body text-sm text-gray-400">
              Google Play · United States · $1.99
            </p>
            <p className="mb-4 font-body text-base text-white">
              3D chess on Android. Optional cloud AI tutor with usage limits.
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div
          className="p-8 text-center"
          style={{
            background: 'var(--vibe-glass-rgba)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--vibe-glass-border)',
            boxShadow: '0 0 30px rgba(0, 242, 255, 0.3)',
            borderRadius: '8px',
          }}
        >
          <h2
            className="mb-3 font-heading text-2xl font-light text-white"
            style={{ color: 'var(--vibe-neon-cyan)' }}
          >
            Custom Work
          </h2>
          <p className="mb-4 font-body text-base text-gray-300">
            Websites and apps
          </p>
          <a
            href="mailto:Bfreshwater@vibe-tech.org"
            className="font-body text-lg text-white underline"
            style={{ color: 'var(--vibe-neon-cyan)' }}
          >
            Bfreshwater@vibe-tech.org
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center font-body text-sm text-gray-400">
          <p>Vibe Tech LLC · Payments via Square</p>
          <p className="mt-2">
            <a href="/privacy" className="underline hover:text-white">
              Privacy
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
