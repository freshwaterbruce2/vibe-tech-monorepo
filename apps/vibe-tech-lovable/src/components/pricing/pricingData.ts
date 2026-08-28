
import { PricingTier, MarketComparisonType } from './types';

export const pricingTiers: PricingTier[] = [
  {
    name: "Launch Pad",
    price: {
      monthly: "$49",
      yearly: "$39",
    },
    description: "For one product, offer, or demo that needs a credible launch path.",
    features: [
      { text: "Product landing page positioning", included: true },
      { text: "Lead capture and contact flow", included: true },
      { text: "Basic SEO metadata and route checks", included: true },
      { text: "Launch readiness checklist", included: true },
      { text: "Monthly copy and offer updates", included: true },
      { text: "Stripe or booking workflow support", included: false },
      { text: "Multi-product catalog management", included: false },
      { text: "Dedicated growth experiments", included: false },
    ],
    comparisons: [
      { text: "Built for real product launches, not placeholder pages" },
      { text: "Good fit for a single offer with clear buyer action" }
    ],
    cta: "Start Launch",
  },
  {
    name: "Growth Stack",
    price: {
      monthly: "$149",
      yearly: "$119",
    },
    description: "For multiple shipped apps that need a shared marketing and revenue engine.",
    features: [
      { text: "Product suite portfolio and service mapping", included: true },
      { text: "Case-study and demo-page updates", included: true },
      { text: "Quote request funnel and buyer segmentation", included: true },
      { text: "Stripe, booking, or checkout messaging", included: true },
      { text: "Monthly launch metrics review", included: true },
      { text: "Shared content calendar", included: true },
      { text: "Custom conversion experiments", included: true },
      { text: "Dedicated platform roadmap support", included: false },
    ],
    comparisons: [
      { text: "Connects Vibe Tutor, Chessmaster Academy, and the full project suite under one Vibe-Tech.org front door" },
      { text: "Designed for SaaS demos, checkout paths, and sales follow-up" }
    ],
    highlighted: true,
    badge: "Best Fit",
    cta: "Choose Growth",
  },
  {
    name: "Factory Partner",
    price: {
      monthly: "$499",
      yearly: "$399",
    },
    description: "For ongoing product-factory work across marketing, launches, and revenue systems.",
    features: [
      { text: "Everything in Growth Stack", included: true },
      { text: "New app launch positioning", included: true },
      { text: "Revenue platform and entitlement messaging", included: true },
      { text: "Production deployment readiness support", included: true },
      { text: "Operator dashboard and analytics copy", included: true },
      { text: "Custom product-market experiments", included: true },
      { text: "Founder-level roadmap planning", included: true },
      { text: "Priority monthly implementation slots", included: true },
    ],
    comparisons: [
      { text: "Replaces disconnected launch pages with one product factory system" },
      { text: "Supports recurring launches instead of one-off brochure work" }
    ],
    cta: "Plan Factory",
  },
];

export const marketComparisons: MarketComparisonType[] = [
  {
    category: "DIY Pages",
    description: "Template pages without product context",
    pricing: "$14-49/mo",
    limitations: "Generic offers, disconnected demos, manual launch follow-up"
  },
  {
    category: "Vibe-Tech Hub",
    description: "Original website connected to the shipped app portfolio",
    pricing: "$49-499/mo",
    limitations: "Product catalog, buyer paths, launch updates, checkout positioning",
    highlighted: true
  },
  {
    category: "Generic Agencies",
    description: "Campaign work detached from product code",
    pricing: "$3,000-15,000+",
    limitations: "Long handoffs, separate teams, limited product ownership"
  },
  {
    category: "Custom Builds",
    description: "One-off software projects",
    pricing: "$10,000+",
    limitations: "Useful for net-new builds, slower for repeat launches"
  }
];
