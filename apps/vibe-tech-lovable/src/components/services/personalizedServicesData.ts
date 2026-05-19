import { Zap, Brain, Building2, Globe, DollarSign, Activity, GraduationCap } from "lucide-react";
import { ServiceType } from "./types";

export const personalizedServices: ServiceType[] = [
  {
    id: "micro-saas",
    name: "Micro-SaaS Product Factory",
    description:
      "Launch-ready SaaS foundations with landing pages, auth, billing, analytics, entitlements, deployment checks, and reusable shared packages.",
    icon: {
      type: Building2,
      props: {
        className: "h-6 w-6 text-[color:var(--c-cyan)]"
      }
    },
    features: [
      "Generated Vite/React SaaS frontends",
      "Fastify API scaffolds with health and auth flows",
      "Stripe Checkout and entitlement integration paths",
      "Vercel/Railway deployment guidance",
      "Reusable Nx and pnpm workspace patterns"
    ],
    technologies: ["Nx", "pnpm", "React", "Fastify", "Stripe", "Railway", "Vercel"],
    realProjects: [
      "Proposal Review SaaS",
      "AppointmentReminderSaas",
      "Factory runtime and landing smoke apps"
    ],
    businessValue: "Faster product launches with a repeatable monetization and deployment baseline"
  },
  {
    id: "clinic-operations",
    name: "Clinic Operations Software",
    description:
      "Patient-flow tools for small clinics that need reminders, no-show visibility, and rescheduling without adding front-desk load.",
    icon: {
      type: Activity,
      props: {
        className: "h-6 w-6 text-[color:var(--c-purple)]"
      }
    },
    features: [
      "Appointment reminder sweeps",
      "Magic patient reschedule links",
      "No-show tracking and monthly analytics",
      "Tenant-aware demo clinic data",
      "Frontend/API deployment split"
    ],
    technologies: ["React", "Fastify", "SQLite", "Tenant Headers", "Railway", "Vercel"],
    realProjects: [
      "Clinic Autopilot",
      "AppointmentReminderSaas",
      "Reschedule route workflow"
    ],
    businessValue: "Reduce no-shows and manual reminder work for appointment-based businesses"
  },
  {
    id: "ai-tools",
    name: "AI Review and Rewrite Tools",
    description:
      "Focused AI tools that turn messy business inputs into scores, recommendations, and paid upgrade opportunities.",
    icon: {
      type: Brain,
      props: {
        className: "h-6 w-6 text-[color:var(--c-teal)]"
      }
    },
    features: [
      "Proposal scorecards and risk flags",
      "Scope, pricing, and turnaround review",
      "Pro rewrite preview flow",
      "AI usage metering bridge to billing metadata",
      "Operator sign-in for gated features"
    ],
    technologies: ["React", "Fastify", "AI Metering", "Stripe Checkout", "Auth Sessions"],
    realProjects: [
      "Proposal Review SaaS",
      "Pro rewrite lane",
      "Generated operator auth"
    ],
    businessValue: "Convert expert review into a repeatable paid product"
  },
  {
    id: "business-automation",
    name: "Business Automation Dashboards",
    description:
      "Back-office systems for teams that need client records, invoices, templates, time, expenses, payment paths, and operational clarity.",
    icon: {
      type: Zap,
      props: {
        className: "h-6 w-6 text-[color:var(--c-cyan)]"
      }
    },
    features: [
      "Client and invoice management",
      "Template and tax-rate workflows",
      "Expense and time tracking",
      "Protected dashboard routes",
      "Payment-facing invoice routes"
    ],
    technologies: ["React", "Protected Routes", "Payments", "Templates", "Reporting"],
    realProjects: [
      "Invoice Automation",
      "Client dashboards",
      "Invoice payment route"
    ],
    businessValue: "Replace spreadsheet-heavy workflows with focused operational software"
  },
  {
    id: "education-platforms",
    name: "Education and Training Platforms",
    description:
      "Learning products for tutoring, practice games, student dashboards, mobile delivery, and AI-supported study workflows.",
    icon: {
      type: GraduationCap,
      props: {
        className: "h-6 w-6 text-[color:var(--c-teal)]"
      }
    },
    features: [
      "Tutor-first learning flows",
      "Student dashboards and progress surfaces",
      "Game-based practice modules",
      "Android delivery path",
      "AI assistance for learning workflows"
    ],
    technologies: ["React", "Electron", "Capacitor", "Android", "AI Assistance", "Learning Games"],
    realProjects: [
      "Vibe Tutor",
      "Chessmaster Academy",
      "Tutoring workflows",
      "Learning-game surfaces"
    ],
    businessValue: "Turn education tools into clear product offers for learners, parents, and operators"
  },
  {
    id: "marketing-hub",
    name: "Product Marketing Hub",
    description:
      "Use Vibe-Tech.org as the front door for all Vibe-Tech project demos, quote requests, case studies, pricing, and launch updates.",
    icon: {
      type: Globe,
      props: {
        className: "h-6 w-6 text-[color:var(--c-purple)]"
      }
    },
    features: [
      "Multi-page product catalog",
      "Portfolio case studies",
      "Lead capture and contact flows",
      "SEO metadata and sitemap alignment",
      "Domain and deployment correction path"
    ],
    technologies: ["React", "Vite", "SEO", "Vercel", "Cloudflare", "Lead Forms"],
    realProjects: [
      "Original Vibe-Tech.org website",
      "Vibe-Tech Lovable site",
      "Vibe Tutor",
      "Chessmaster Academy",
      "Full project suite portfolio"
    ],
    businessValue: "Turn every shipped app into a visible offer with a clear buyer path"
  },
  {
    id: "revenue-platforms",
    name: "Revenue Platform Integration",
    description:
      "Connect product demos to checkout, onboarding, analytics, and deployment checks so offers can become paid products.",
    icon: {
      type: DollarSign,
      props: {
        className: "h-6 w-6 text-[color:var(--c-teal)]"
      }
    },
    features: [
      "Stripe Checkout test-mode readiness",
      "Usage-to-billing metadata patterns",
      "MRR and first-revenue tracking hooks",
      "Production ship-check gates",
      "Frontend/backend deployment proof"
    ],
    technologies: ["Stripe", "Analytics", "Entitlements", "Vercel", "Railway", "Ship Checks"],
    realProjects: [
      "Proposal Review checkout flow",
      "Generated SaaS monetization metadata",
      "Factory deployment guides"
    ],
    businessValue: "Move from demos to repeatable paid offers with measurable launch gates"
  }
];

// Pricing tiers based on actual project complexity
export const pricingTiers = [
  {
    name: "Automation Solution",
    price: "$5,000 - $15,000",
    description: "Single business process automation",
    includes: [
      "Custom workflow automation",
      "Data processing and integration", 
      "Basic monitoring and alerts",
      "30-day support and maintenance"
    ]
  },
  {
    name: "Platform Development", 
    price: "$15,000 - $50,000",
    description: "Complete booking/content platform",
    includes: [
      "Full-stack web application",
      "API integrations (booking/AI/payment)",
      "Admin dashboard and analytics",
      "90-day support and training"
    ]
  },
  {
    name: "Financial Technology",
    price: "$25,000 - $100,000",
    description: "Advanced trading/fintech system",
    includes: [
      "Real-time trading system development",
      "Risk management and monitoring",
      "Advanced analytics and reporting",
      "6-month support and optimization"
    ]
  }
];

// Industries you actually serve based on projects
export const targetIndustries = [
  {
    name: "Financial Services",
    description: "Trading firms, investment platforms, crypto exchanges",
    projects: ["Kraken trading systems", "Portfolio management", "Risk assessment"]
  },
  {
    name: "Hospitality & Travel", 
    description: "Hotels, vacation rentals, booking platforms",
    projects: ["Hotel booking systems", "Rental marketplaces", "Travel management"]
  },
  {
    name: "Enterprise Operations",
    description: "Large corporations, logistics, manufacturing",
    projects: ["Walmart shipping management", "Process automation", "Productivity tools"]
  },
  {
    name: "Content & Marketing",
    description: "Publishers, content creators, affiliate marketers", 
    projects: ["Blog publishing platforms", "Content generation", "Affiliate systems"]
  }
];
