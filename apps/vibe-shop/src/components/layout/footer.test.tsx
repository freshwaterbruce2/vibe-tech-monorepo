import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './footer';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up-icon">TrendingUp</span>,
}));

describe('Footer', () => {
  it('renders without crashing', () => {
    render(<Footer />);
    expect(screen.getByText('Vibe-shop')).toBeInTheDocument();
  });

  it('displays brand logo and name', () => {
    render(<Footer />);
    expect(screen.getByText('Vibe-shop')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
  });

  it('displays tagline', () => {
    render(<Footer />);
    expect(
      screen.getByText('Discover trending products with the best deals, updated daily.')
    ).toBeInTheDocument();
  });

  it('renders Shop section', () => {
    render(<Footer />);
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Trending Now')).toBeInTheDocument();
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Home & Garden').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fashion').length).toBeGreaterThan(0);
  });

  it('renders Company section', () => {
    render(<Footer />);
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('About Us')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders Legal section', () => {
    render(<Footer />);
    expect(screen.getByText('Legal')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Affiliate Disclosure')).toBeInTheDocument();
  });

  it('all links have correct hrefs', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    
    const trendingLink = links.find((link) => link.textContent === 'Trending Now');
    expect(trendingLink).toHaveAttribute('href', '/');
    
    const privacyLink = links.find((link) => link.textContent === 'Privacy Policy');
    expect(privacyLink).toHaveAttribute('href', '/privacy');
    
    const contactLink = links.find((link) => link.textContent === 'Contact');
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('displays copyright with current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`© ${currentYear} Vibe-shop. All rights reserved.`)
    ).toBeInTheDocument();
  });

  it('applies footer styling classes', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer?.className).toContain('border-t');
    expect(footer?.className).toContain('bg-muted/30');
  });

  it('uses grid layout for sections', () => {
    const { container } = render(<Footer />);
    const gridElement = container.querySelector('.grid');
    expect(gridElement).toBeInTheDocument();
    expect(gridElement?.className).toContain('grid-cols-2');
    expect(gridElement?.className).toContain('md:grid-cols-4');
  });

  it('brand section spans 2 columns on small screens', () => {
    const { container } = render(<Footer />);
    const brandSection = container.querySelector('.col-span-2');
    expect(brandSection).toBeInTheDocument();
  });

  it('bottom bar is separated with border', () => {
    const { container } = render(<Footer />);
    const bottomBar = container.querySelector('.border-t');
    expect(bottomBar).toBeInTheDocument();
  });

  it('logo links to homepage', () => {
    render(<Footer />);
    const logoLink = screen.getAllByRole('link').find(link => 
      link.querySelector('[data-testid="trending-up-icon"]')
    );
    expect(logoLink).toHaveAttribute('href', '/');
  });
});
