
import { Project } from "./types";

export const projects: Project[] = [
  {
    id: 1,
    title: "Proposal Review SaaS",
    category: "AI SaaS",
    description:
      "A generated proposal-review product that scores client proposals, highlights risk, produces rewrite guidance, and connects to auth, entitlements, analytics, and Stripe Checkout for paid upgrade paths.",
    image: "/custom-images/app-screenshots/proposal-review-saas.png",
    tags: ["React", "Fastify", "Stripe Checkout", "AI Metering", "Railway", "Vercel"]
  },
  {
    id: 2,
    title: "Clinic Autopilot",
    category: "Healthcare SaaS",
    description:
      "A clinic operations app for appointment reminder sweeps, patient self-rescheduling links, no-show tracking, and month-level analytics. Built as the AppointmentReminderSaas factory product.",
    image: "/custom-images/app-screenshots/clinic-autopilot.png",
    tags: ["React", "Fastify", "Reminders", "Tenant Data", "No-show Analytics"]
  },
  {
    id: 3,
    title: "Invoice Automation",
    category: "Finance SaaS",
    description:
      "A small-business finance platform with clients, invoice creation, expenses, time tracking, templates, tax rates, protected dashboards, and invoice payment routes.",
    image: "/custom-images/app-screenshots/invoice-automation-saas.png",
    tags: ["React", "Invoices", "Payments", "Client Records", "Protected Routes"]
  },
  {
    id: 4,
    title: "NOVA Agent",
    category: "Desktop AI Assistant",
    description:
      "A Tauri desktop AI assistant with agent workflows, local workspace context, memory surfaces, and a dashboard built for daily project work.",
    image: "/custom-images/app-screenshots/nova-agent-dashboard.png",
    tags: ["Tauri", "React", "SQLite", "RAG", "Agent Workflows"]
  },
  {
    id: 5,
    title: "Vibe-Tech.org Marketing Hub",
    category: "Marketing System",
    description:
      "The original Vibe-Tech.org website now positioned as the front door for every product, demo, quote request, and productized service coming out of the factory.",
    image: "/custom-images/app-screenshots/vibe-tech-org-home.png",
    tags: ["React", "Portfolio", "Lead Capture", "SEO", "Product Catalog"]
  },
  {
    id: 6,
    title: "Vibe Code Studio",
    category: "AI Code Editor",
    description:
      "A Vibe-Tech desktop code workspace with agent mode, editor tooling, local automation surfaces, and project-aware AI workflows.",
    image: "/custom-images/app-screenshots/vibe-code-studio-agent-mode.png",
    tags: ["Tauri", "React", "Editor", "Agent Mode", "MCP"]
  },
  {
    id: 7,
    title: "Vibe Tutor",
    category: "Education Platform",
    description:
      "A Vibe-Tech education product with tutoring flows, learning dashboards, game-based practice, Android delivery, and AI assistance for student-focused workflows.",
    image: "/custom-images/app-screenshots/vibe-tutor-dashboard.png",
    imageFit: "contain",
    screenshots: [
      "/custom-images/app-screenshots/vibe-tutor-dashboard.png",
      "/custom-images/app-screenshots/vibe-tutor-voice-text.png",
      "/custom-images/app-screenshots/vibe-tutor-progress.png"
    ],
    tags: ["Electron", "Capacitor", "React", "Tutoring", "Learning Games", "Android"]
  },
  {
    id: 8,
    title: "Chessmaster Academy",
    category: "Learning Game",
    description:
      "An interactive chess learning app with lessons, puzzles, AI tutor guidance, Android delivery, and shared Vibe-Tech game components.",
    image: "/custom-images/app-screenshots/chessmaster-play.png",
    imageFit: "contain",
    screenshots: [
      "/custom-images/app-screenshots/chessmaster-play.png",
      "/custom-images/app-screenshots/chessmaster-pieces.png",
      "/custom-images/app-screenshots/chessmaster-dashboard.png"
    ],
    tags: ["React", "Capacitor", "Chess.js", "AI Tutor", "Puzzles", "Android"]
  }
];
