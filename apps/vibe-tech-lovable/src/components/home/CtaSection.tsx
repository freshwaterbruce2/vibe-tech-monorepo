
import { Link } from "react-router-dom";
import { NeonButton } from "@/components/ui/neon-button";

const CtaSection = () => {
  return (
    <section className="relative border-t border-white/10 bg-[rgba(6,4,16,0.72)] px-4 py-24">
      <div className="max-w-4xl mx-auto text-center relative z-10 glass-card p-12 border border-[rgba(185,51,255,0.2)] hover:border-[rgba(185,51,255,0.4)] hover:shadow-neon-purple-soft">
        <h2 className="text-3xl font-bold mb-4 font-heading bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">Turn the Project Suite Into Sales</h2>
        <p className="text-white mb-8 text-lg max-w-2xl mx-auto">
          Vibe Tutor, Chessmaster Academy, Proposal Review, Clinic Autopilot, Invoice Automation, and the next Vibe-Tech apps all need one clear market-facing home.
        </p>
        <NeonButton variant="gradient" size="lg" asChild>
          <Link to="/contact">Start a Launch Conversation</Link>
        </NeonButton>
      </div>
    </section>
  );
};

export default CtaSection;
