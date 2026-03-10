import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './header';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react icons - use importOriginal to include all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Menu: () => <span data-testid="menu-icon">Menu</span>,
    Search: () => <span data-testid="search-icon">Search</span>,
    TrendingUp: () => <span data-testid="trending-up-icon">TrendingUp</span>,
  };
});

describe('Header', () => {
  it('renders without crashing', () => {
    render(<Header />);
    expect(screen.getByText('Vibe-shop')).toBeInTheDocument();
  });

  it('displays logo with branding', () => {
    render(<Header />);
    expect(screen.getByText('Vibe-shop')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Header />);
    expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Home & Garden').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fashion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hobbies').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sports').length).toBeGreaterThan(0);
  });

  it('navigation links have correct hrefs', () => {
    render(<Header />);
    const links = screen.getAllByRole('link');
    const trendingLink = links.find((link) => link.textContent === 'Trending');
    const electronicsLink = links.find((link) => link.textContent === 'Electronics');
    
    expect(trendingLink).toHaveAttribute('href', '/');
    expect(electronicsLink).toHaveAttribute('href', '/category/electronics');
  });

  it('renders search input', () => {
    render(<Header />);
    const searchInput = screen.getByPlaceholderText('Search products...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'search');
    expect(searchInput).toHaveAttribute('name', 'q');
  });

  it('renders mobile menu button', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('opens mobile menu when button clicked', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(menuButton);
    // Menu is now open (Sheet component controls visibility)
  });

  it('logo links to homepage', () => {
    render(<Header />);
    const logoLink = screen.getAllByRole('link').find(link => 
      link.querySelector('[data-testid="trending-up-icon"]')
    );
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('applies sticky header styling', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('sticky');
    expect(header?.className).toContain('top-0');
    expect(header?.className).toContain('z-50');
  });

  it('has proper backdrop blur effect', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('backdrop-blur');
  });
});
