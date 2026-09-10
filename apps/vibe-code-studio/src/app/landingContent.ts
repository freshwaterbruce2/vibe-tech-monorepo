import { createDefaultLandingContent } from '@vibetech/landing';

export const vibeStudioLandingContent = createDefaultLandingContent({
  productName: 'Vibe Code Studio',
  badge: 'YOUR CODE. YOUR AI CHOICE.',
  title: 'Build with AI on your terms',
  subtitle:
    'A code editor with AI chat, project context, and tools for reviewing changes. Bring your own OpenRouter key or choose subscription AI when available.',
  primaryAction: { label: 'Open editor and choose AI plan', href: '#byok' },
  secondaryAction: { label: 'Sign in for subscription AI', href: '#login' },
  previewLabel: 'Your workspace',
  previewItems: [
    'Code editing',
    'AI assistant chat',
    'Project context',
    'Review suggested changes',
  ],
  featuresHeading: 'From idea to reviewed code',
  featuresSubheading: 'Keep your files and AI assistance together in one workspace.',
  features: [
    {
      title: 'Chat about your project',
      description: 'Ask for explanations and changes with relevant project files as context.',
    },
    {
      title: 'Review AI suggestions',
      description: 'Inspect suggested edits and test the results before relying on them.',
    },
    {
      title: 'Choose how you pay for AI',
      description:
        'Use your OpenRouter key, or sign in for a subscription with a defined usage allowance.',
    },
  ],
  pricingHeading: 'Two ways to use AI',
  pricingSubheading:
    'Choose in Settings. Switching payment options takes effect on your next app launch.',
  tiers: [
    {
      name: 'Bring your own key',
      price: 'Provider billed',
      subtitle: 'Pay OpenRouter directly for your usage',
      features: [
        'Open the editor without a subscription account',
        'Add your OpenRouter key in Settings',
        'Your provider manages AI usage and charges',
        'Keep control of your provider account',
      ],
    },
    {
      name: 'Subscription AI',
      price: 'See checkout',
      subtitle: 'Available when the managed service is configured',
      features: [
        'Sign in to check availability',
        'Defined AI request allowance and included models',
        'View remaining usage in Settings',
        'Manage billing and cancellation',
        'No automatic charges to your personal key',
      ],
    },
  ],
  faqHeading: 'Plans and privacy',
  faqSubheading: 'Know where your requests go and how usage is paid for.',
  faqs: [
    {
      question: 'Where does my code go?',
      answer:
        'AI requests send your prompt and selected project context to the AI provider. Subscription requests also pass through the managed service. Review context before sending sensitive material.',
    },
    {
      question: 'What happens when my subscription allowance runs out?',
      answer:
        'Subscription AI requests stop. You can wait for the allowance to reset or explicitly choose your own key in Settings and reopen the app. Your personal key is never used automatically as a backup.',
    },
    {
      question: 'How do I subscribe or cancel?',
      answer:
        'Open AI Plan & Account in Settings. Sign in, refresh availability, and use subscription checkout or Manage billing. Checkout shows the actual price and terms before you pay.',
    },
  ],
  ctaHeading: 'Start with your own workspace',
  ctaBody: 'Open the editor and configure your OpenRouter key in Settings.',
  ctaAction: { label: 'Open editor', href: '#byok' },
});
