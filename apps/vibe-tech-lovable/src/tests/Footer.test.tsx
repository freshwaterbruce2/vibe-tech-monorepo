import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Footer from '../components/Footer';

vi.mock('../components/NewsletterSubscribe', () => ({
  default: () => <div data-testid="newsletter-subscribe" />,
}));

describe('Footer', () => {
  it('links to the current contact email and phone number', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Bfreshwater@vibe-tech.org' })).toHaveAttribute(
      'href',
      'mailto:Bfreshwater@vibe-tech.org',
    );
    expect(screen.getByRole('link', { name: '(803) 825-2876' })).toHaveAttribute(
      'href',
      'tel:+18038252876',
    );
  });
});
