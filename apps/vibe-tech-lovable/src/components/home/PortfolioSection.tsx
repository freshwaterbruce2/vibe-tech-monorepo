
import { Link } from "react-router-dom";
import { NeonButton } from "@/components/ui/neon-button";

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  imageFit?: "cover" | "contain";
}

const projects: Project[] = [
  {
    id: 1,
    title: "Proposal Review SaaS",
    description:
      "AI-assisted proposal scoring, rewrite guidance, generated auth, entitlements, and Stripe Checkout for paid upgrades.",
    image: "/custom-images/app-screenshots/proposal-review-saas.png"
  },
  {
    id: 2,
    title: "Clinic Autopilot",
    description:
      "Appointment reminders, no-show analytics, and patient self-rescheduling links for local clinics.",
    image: "/custom-images/app-screenshots/clinic-autopilot.png"
  },
  {
    id: 3,
    title: "Invoice Automation",
    description:
      "Client, invoice, expense, template, tax-rate, and payment workflows for small business operations.",
    image: "/custom-images/app-screenshots/invoice-automation-saas.png"
  },
  {
    id: 7,
    title: "Vibe Tutor",
    description:
      "Education platform for tutoring flows, learning dashboards, games, Android delivery, and student-focused AI assistance.",
    image: "/custom-images/app-screenshots/vibe-tutor-dashboard.png",
    imageFit: "contain"
  },
  {
    id: 8,
    title: "Chessmaster Academy",
    description:
      "Interactive chess lessons, puzzles, mobile gameplay, and AI tutor guidance for structured practice.",
    image: "/custom-images/app-screenshots/chessmaster-play.png",
    imageFit: "contain"
  }
];

const PortfolioSection = () => {
  return (
    <section
      className="relative border-y border-[rgba(185,51,255,0.18)] bg-[rgba(3,6,16,0.76)] px-4 py-16 md:py-24"
      data-testid="portfolio-section"
    >
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-3xl font-bold mb-12 text-center font-heading bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">Vibe-Tech Projects Now Shipping</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {projects.map((project) => (
            <Link 
              key={project.id}
              to={`/portfolio/project-${project.id}`}
              className="group project-card"
            >
              <div className="glass-card border border-[rgba(185,51,255,0.2)] hover:border-[rgba(185,51,255,0.4)] hover:shadow-neon-purple transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 h-full">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className={`w-full h-full ${
                      project.imageFit === "contain"
                        ? "object-contain bg-[rgba(2,6,18,0.92)] p-3"
                        : "object-cover"
                    } group-hover:scale-105 transition-transform duration-300`}
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2 font-heading bg-gradient-to-r from-[#c87eff] via-[#8d4dff] to-[#00f7ff] text-transparent bg-clip-text">
                    {project.title}
                  </h3>
                  <p className="text-white">
                    {project.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <NeonButton variant="gradient" asChild>
            <Link to="/portfolio">View All Projects</Link>
          </NeonButton>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
