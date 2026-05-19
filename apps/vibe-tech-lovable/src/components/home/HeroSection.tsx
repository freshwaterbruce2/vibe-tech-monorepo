import SmartLeadForm from '@/components/lead/SmartLeadForm';
import { NeonButton } from '@/components/ui/neon-button';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-12 sm:pt-28 sm:pb-16">
      {/* Glassmorphic Container with Vibe Tech Premium Aesthetic */}
      <div
        className="relative z-10 mx-auto grid max-w-6xl gap-8 px-6 py-8 sm:py-10 lg:grid-cols-[0.8fr_1.4fr] lg:items-center"
        style={{
          background: 'var(--vibe-glass-rgba)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--vibe-glass-border)',
          boxShadow: '0 0 30px rgba(0, 242, 255, 0.3), 0 8px 32px 0 rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
        }}
      >
        {/* Left side - Avatar with Neon Cyan border */}
        <div className="w-full">
          <div
            className="relative mx-auto h-36 w-36 overflow-hidden rounded-full transition-all duration-300 hover:scale-105 sm:h-56 sm:w-56 lg:h-64 lg:w-64"
            style={{
              border: '4px solid var(--vibe-neon-cyan)',
              boxShadow: '0 0 25px rgba(0, 242, 255, 0.6), inset 0 0 15px rgba(0, 242, 255, 0.2)',
            }}
          >
            <img
              src="/profilephoto.png?t=1726771200"
              alt="Bruce Freshwater"
              className="w-full h-full object-contain object-center"
            />
          </div>
        </div>

        {/* Right side - Text with Vibe Tech Premium Typography */}
        <div className="w-full">
          <h1
            className="mb-4 font-heading text-3xl font-light text-white sm:text-4xl md:text-5xl lg:text-6xl"
            style={{
              letterSpacing: 'var(--vibe-letter-spacing-wide)',
              textShadow: '0 0 20px rgba(0, 242, 255, 0.5)',
            }}
          >
            Hello, I'm <span style={{ color: 'var(--vibe-neon-cyan)' }}>Bruce Freshwater</span>
          </h1>

          <div className="mb-6">
            <h2 className="font-heading text-xl font-light tracking-wide text-white sm:text-2xl md:text-3xl">
              The Product Hub for Everything Vibe-Tech Builds
            </h2>
          </div>

          <p className="mb-6 max-w-2xl font-body text-sm leading-relaxed text-gray-300 sm:mb-8 sm:text-base">
            Vibe-Tech.org is the front door for every Vibe-Tech project: Vibe Tutor,
            Chessmaster Academy, Proposal Review, Clinic Autopilot, Invoice Automation, desktop
            tools, AI workflows, and the next products coming out of the Vibe-Tech factory.
          </p>

          <div className="mb-8 hidden sm:block">
            <h3
              className="text-lg font-heading font-light mb-3 tracking-widest"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              Ready to Launch the Next Offer?
            </h3>
            <p className="mb-4 text-gray-300 font-body">
              Tell me which product or workflow you want to sell, and I will map it into a clear
              buyer path.
            </p>
            <SmartLeadForm variant="inline" buttonText="Contact Me" showServiceInterest={false} />

            <div className="text-center my-4">
              <span className="px-4 relative inline-flex items-center">
                <span
                  className="absolute left-0 w-full top-1/2 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, var(--vibe-neon-cyan), transparent)',
                    boxShadow: '0 0 8px var(--vibe-neon-cyan)',
                  }}
                />
                <span
                  className="px-4 relative z-10 text-gray-400 font-body text-sm"
                  style={{ backgroundColor: 'var(--vibe-bg-deep)' }}
                >
                  or
                </span>
              </span>
            </div>
          </div>

          <div className="mb-4 flex justify-center sm:hidden">
            <NeonButton variant="gradient" size="lg" asChild>
              <Link to="/contact">Contact Me</Link>
            </NeonButton>
          </div>

          <div className="text-center">
            <NeonButton variant="gradient" size="lg" asChild>
              <Link to="/portfolio">Explore Products</Link>
            </NeonButton>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
