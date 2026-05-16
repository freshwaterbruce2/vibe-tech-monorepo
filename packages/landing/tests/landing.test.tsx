import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LandingPage, createDefaultLandingContent } from '../src/index.js';

describe('@vibetech/landing', () => {
  it('creates default content with overrides', () => {
    const content = createDefaultLandingContent({
      productName: 'InvoiceFlow',
      title: 'Get paid faster',
    });

    expect(content.productName).toBe('InvoiceFlow');
    expect(content.title).toBe('Get paid faster');
    expect(content.tiers).toHaveLength(3);
  });

  it('renders the key landing sections', () => {
    const html = renderToStaticMarkup(
      <LandingPage
        content={createDefaultLandingContent({
          productName: 'InvoiceFlow',
          title: 'Invoice automation that helps you get paid faster',
        })}
      />,
    );

    expect(html).toContain('Invoice automation that helps you get paid faster');
    expect(html).toContain('Pricing that scales with usage');
    expect(html).toContain('Questions teams usually ask first');
  });
});
