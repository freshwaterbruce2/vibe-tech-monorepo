import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Footer from '../components/Footer';

describe('Footer', () => {
  it('displays company branding and contact email', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText('Vibe Tech LLC')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bfreshwater@vibe-tech.org' })).toHaveAttribute(
      'href',
      'mailto:Bfreshwater@vibe-tech.org',
    );
  });

  it('displays payment info and links to privacy/terms', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Android apps on Google Play\. Payments via Square\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });
});
