
import { useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import HeroSection from "@/components/home/HeroSection";

const Index = () => {
  useEffect(() => {
    document.title = "Vibe Tech LLC | Apps on Google Play";
  }, []);

  return (
    <PageLayout
      title="Vibe Tech LLC"
      description="Vibe Tech LLC ships Android apps: Vibe Tutor ($2.99, homework help for teens) and Chess Master ($1.99, 3D chess with AI tutor). Custom websites and apps available."
      keywords="vibe tech, vibe tutor, chess master, android apps, google play, homework help, chess app, Bruce Freshwater"
    >
      <HeroSection />
    </PageLayout>
  );
};

export default Index;
