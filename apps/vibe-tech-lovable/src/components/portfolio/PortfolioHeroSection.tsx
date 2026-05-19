import PageHeader from "@/components/ui/page-header";
import { motion } from "framer-motion";
const PortfolioHeroSection = () => {
  return <section className="pt-28 pb-12 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Project Portfolio" subtitle="Explore the Vibe-Tech apps, learning products, SaaS tools, and automation systems now connected through Vibe-Tech.org." />
        
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.3,
        duration: 0.7
      }} className="mt-8 text-center">
          <p className="max-w-2xl mx-auto text-gray-50">
            This is the catalog behind the public front door: Vibe Tutor, Chessmaster Academy,
            Proposal Review, Clinic Autopilot, Invoice Automation, and the launch systems that
            turn each app into a market-facing offer.
          </p>
        </motion.div>
      </div>
      
      {/* Decorative elements to mimic circuit board patterns */}
      <div className="absolute top-24 left-10 w-24 h-24 rounded-full bg-aura-neonBlue/5 blur-xl"></div>
      <div className="absolute bottom-10 right-20 w-32 h-32 rounded-full bg-aura-neonPurple/5 blur-xl"></div>
    </section>;
};
export default PortfolioHeroSection;
