import type { LegalPageProps } from './LegalPage';

export const termsLegalPage: LegalPageProps = {
  title: 'Terms of service',
  intro:
    'These starter terms cover evaluation, billing, and acceptable use for the generated Proposal Review micro-tool.',
  sections: [
    {
      heading: 'Use of the service',
      body:
        'Proposal Review is intended for freelancers, studios, and operators who need a quick proposal scoring workflow. You are responsible for the underlying client commitments you send.',
    },
    {
      heading: 'Billing',
      body:
        'Paid features are delivered through Stripe Checkout. Subscription access continues until cancellation or failed renewal under the billing settings shown at checkout.',
    },
    {
      heading: 'Content responsibility',
      body:
        'You should not paste regulated, secret, or client-prohibited material into the service unless you are authorized to do so. Generated guidance is operational help, not legal advice.',
    },
  ],
};

export const privacyLegalPage: LegalPageProps = {
  title: 'Privacy policy',
  intro: 'This starter privacy policy explains the default data path for Proposal Review.',
  sections: [
    {
      heading: 'What we collect',
      body:
        'The app stores proposal inputs, billing events, and operational analytics needed to deliver the review workflow and troubleshoot failures.',
    },
    {
      heading: 'Payments',
      body:
        'Card handling is delegated to Stripe. The app stores Stripe identifiers and billing state, but it does not store raw card details.',
    },
    {
      heading: 'Analytics',
      body:
        'Analytics are off until configured. When enabled, product usage events should stay limited to workflow telemetry rather than proposal body contents.',
    },
  ],
};
