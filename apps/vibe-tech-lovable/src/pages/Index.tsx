
import { useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import PortfolioSection from "@/components/home/PortfolioSection";
import BlogSection from "@/components/home/BlogSection";
import CtaSection from "@/components/home/CtaSection";

const Index = () => {
  useEffect(() => {
    document.title = "Vibe Tech | Project Front Door";
  }, []);

  return (
      <PageLayout
        title="Home"
      description="Vibe-Tech.org is the front door for the Vibe-Tech project suite, including Vibe Tutor, Chessmaster Academy, Proposal Review, Clinic Autopilot, Invoice Automation, and new AI business tools."
      keywords="vibe tech, vibe tutor, chessmaster academy, proposal review, clinic automation, invoice automation, micro saas, AI business tools, Bruce Freshwater"
    >
      {/* Hero Section */}
      <HeroSection />

      {/* Services Section */}
      <ServicesSection />

      {/* Portfolio Highlights */}
      <PortfolioSection />

      {/* Latest Blog Posts */}
      <BlogSection />

      {/* CTA Section */}
      <CtaSection />
    </PageLayout>
  );
};

export default Index;
