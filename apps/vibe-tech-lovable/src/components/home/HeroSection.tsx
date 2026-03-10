import SmartLeadForm from '@/components/lead/SmartLeadForm';
import { NeonButton } from '@/components/ui/neon-button';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="pt-28 pb-20 relative">
      {/* Glassmorphic Container with Vibe Tech Premium Aesthetic */}
      <div
        className="mx-auto max-w-6xl px-6 py-10 lg:flex lg:items-center relative z-10"
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
        <div className="w-full md:w-1/3 mb-10 md:mb-0">
          <div
            className="relative w-64 h-64 mx-auto overflow-hidden rounded-full transition-all duration-300 hover:scale-105"
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
        <div className="w-full md:w-2/3 md:pl-12">
          <h1
            className="font-heading text-4xl md:text-5xl lg:text-6xl font-light mb-4 text-white"
            style={{
              letterSpacing: 'var(--vibe-letter-spacing-wide)',
              textShadow: '0 0 20px rgba(0, 242, 255, 0.5)',
            }}
          >
            Hello, I'm <span style={{ color: 'var(--vibe-neon-cyan)' }}>Bruce Freshwater</span>
          </h1>

          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-light text-white tracking-wide">
              Your Partner in Next-Level Digital Experiences
            </h2>
          </div>

          <p className="mb-8 max-w-2xl text-gray-300 font-body leading-relaxed">
            Imagine a world where your website or app loads instantly, welcomes every user, and
            feels as intuitive as a conversation. That's the power of design and code working in
            perfect harmony.
          </p>

          <div className="mb-8">
            <h3
              className="text-lg font-heading font-light mb-3 tracking-widest"
              style={{ color: 'var(--vibe-neon-cyan)' }}
            >
              Ready to Ignite Your Vision?
            </h3>
            <p className="mb-4 text-gray-300 font-body">
              Tell me your goals, and together we'll craft a digital solution that dazzles and
              delivers.
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

          <div className="text-center">
            <NeonButton variant="gradient" size="lg" asChild>
              <Link to="/portfolio">View My Work</Link>
            </NeonButton>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
