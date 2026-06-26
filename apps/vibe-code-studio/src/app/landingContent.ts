/**
 * Marketing landing-page content for the unauthenticated Vibe Code Studio shell.
 *
 * Extracted from AppLayout.tsx (static config, not layout logic) to keep that file
 * within the 500 +/- 100 line target.
 */
import { createDefaultLandingContent } from '@vibetech/landing';

export const vibeStudioLandingContent = createDefaultLandingContent({
  productName: 'Vibe Code Studio',
  badge: 'VIBE CODE STUDIO • NEURAL INTERFACE',
  title: 'Next-generation AI-powered code editor where innovation meets elegant design',
  subtitle: 'Resurrect your workflows with context-aware AI assistant, proactive error fixing, multi-agent orchestrations, and a premium developer environment.',
  primaryAction: { label: 'Get Started Free', href: '#signup' },
  secondaryAction: { label: 'Sign In', href: '#login' },
  previewLabel: 'What\'s Included',
  previewItems: [
    '⚡ Proactive AI Autocomplete',
    '🧠 Full Codebase Semantic Search',
    '🛠️ Real-time Auto-Fix & Debugging',
    '🤝 Multi-Agent Swarm Orchestrator'
  ],
  featuresHeading: 'Engineered for Elite Developers',
  featuresSubheading: 'Built on Tauri 2.0 with a high-performance SQLite WAL storage engine.',
  features: [
    {
      title: 'Context-Aware AI Chat',
      description: 'Interact with your codebase. Vibe Code Studio understands file relationships, test suites, and project dependencies.'
    },
    {
      title: 'Auto-Fix Proactive Debugger',
      description: 'Errors are caught and resolved before you hit compile. Generate unit tests and refactor with single-click diff approval.'
    },
    {
      title: 'Monetized App Factory',
      description: 'Integrated with Stripe billing, secure scrypt/bcrypt authentication, and real-time entitlements gating.'
    }
  ],
  pricingHeading: 'Simple, Flexible Pricing',
  pricingSubheading: 'Unlock the full power of context-aware multi-agent development.',
  tiers: [
    {
      name: 'Free Tier',
      price: '$0',
      subtitle: 'For evaluation and personal projects',
      features: [
        'Core editor workspace',
        'Basic AI chat assistant (10 messages/day)',
        'Local SQLite storage mode',
        'Standard theme library'
      ]
    },
    {
      name: 'Pro Tier',
      price: '$19',
      subtitle: 'Per month, billed monthly',
      featured: true,
      features: [
        'Unlimited AI chat assistant queries',
        'Proactive AI autocomplete',
        'Multi-agent execution engine',
        'Custom workspace rules & parser',
        'Priority feature flags & telemetry'
      ]
    }
  ],
  faqHeading: 'Frequently Asked Questions',
  faqSubheading: 'Everything you need to know about plans and security.',
  faqs: [
    {
      question: 'Is my codebase secure?',
      answer: 'Yes. All state is saved locally in D:\\databases\\vibe_studio.db. We support local models and secure proxy channels.'
    },
    {
      question: 'How do I upgrade to Pro?',
      answer: 'Click the upgrade action to initiate a Stripe session. Once processed via the Stripe Webhook Bus, your features will unlock instantly.'
    }
  ],
  ctaHeading: 'Ready to elevate your development environment?',
  ctaBody: 'Create a free account or upgrade to Pro to start shipping with advanced agent intelligence.',
  ctaAction: { label: 'Get Started Now', href: '#signup' }
});
