import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './product-card';
import type { Product } from '@/types';

// Mock Next.js Link and Image
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

// Mock lucide-react icons - use importOriginal to include all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    ExternalLink: () => <span data-testid="external-link-icon">ExternalLink</span>,
    TrendingUp: () => <span data-testid="trending-up-icon">TrendingUp</span>,
  };
});

const mockProduct: Product = {
  id: 'prod-1',
  externalId: 'ext-1',
  network: 'shareasale',
  name: 'Test Smart Watch',
  description: 'A great smartwatch',
  price: 199.99,
  currency: 'USD',
  imageUrl: 'https://example.com/watch.jpg',
  affiliateLink: 'https://example.com/affiliate',
  categoryId: 'electronics',
  trendScore: 85,
  commissionRate: 10,
  merchantName: 'TestMerchant',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  expiresAt: null,
};

describe('ProductCard', () => {
  it('renders without crashing', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Smart Watch')).toBeInTheDocument();
  });

  it('displays product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Smart Watch')).toBeInTheDocument();
  });

  it('displays product price formatted correctly', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('$199.99')).toBeInTheDocument();
  });

  it('displays merchant name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('TestMerchant')).toBeInTheDocument();
  });

  it('renders image with correct alt text', () => {
    render(<ProductCard product={mockProduct} />);
    const image = screen.getByAltText('Test Smart Watch');
    expect(image).toBeInTheDocument();
  });

  it('displays "Hot" badge for high trend score (>= 70)', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('does not display "Hot" badge for low trend score', () => {
    const lowTrendProduct = { ...mockProduct, trendScore: 50 };
    render(<ProductCard product={lowTrendProduct} />);
    expect(screen.queryByText('Hot')).not.toBeInTheDocument();
  });

  it('displays rank badge for top 3 products', () => {
    render(<ProductCard product={mockProduct} rank={1} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('applies gold color for rank 1', () => {
    render(<ProductCard product={mockProduct} rank={1} />);
    const badge = screen.getByText('#1');
    expect(badge.className).toContain('bg-yellow-500');
  });

  it('applies silver color for rank 2', () => {
    render(<ProductCard product={mockProduct} rank={2} />);
    const badge = screen.getByText('#2');
    expect(badge.className).toContain('bg-gray-400');
  });

  it('applies bronze color for rank 3', () => {
    render(<ProductCard product={mockProduct} rank={3} />);
    const badge = screen.getByText('#3');
    expect(badge.className).toContain('bg-amber-600');
  });

  it('does not display rank badge when rank is not provided', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.queryByText(/^#\d+$/)).not.toBeInTheDocument();
  });

  it('does not display rank badge for ranks > 3', () => {
    render(<ProductCard product={mockProduct} rank={4} />);
    expect(screen.queryByText('#4')).not.toBeInTheDocument();
  });

  it('renders "View Deal" button with affiliate link', () => {
    render(<ProductCard product={mockProduct} />);
    const viewDealLink = screen.getByText('View Deal').closest('a');
    expect(viewDealLink).toHaveAttribute('href', '/api/click/prod-1');
    expect(viewDealLink).toHaveAttribute('target', '_blank');
    expect(viewDealLink).toHaveAttribute('rel', 'noopener noreferrer sponsored');
  });

  it('renders product detail link', () => {
    render(<ProductCard product={mockProduct} />);
    const links = screen.getAllByRole('link');
    const productLink = links.find((link) => link.getAttribute('href') === '/product/prod-1');
    expect(productLink).toBeInTheDocument();
  });

  it('displays currency when not USD', () => {
    const eurProduct = { ...mockProduct, currency: 'EUR' };
    render(<ProductCard product={eurProduct} />);
    expect(screen.getByText('EUR')).toBeInTheDocument();
  });

  it('does not display currency badge when USD', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.queryByText('USD')).not.toBeInTheDocument();
  });

  it('applies correct trend badge color for different scores', () => {
    // Test red (>= 80) - Badge shows for trendScore >= 70
    const { rerender } = render(<ProductCard product={{ ...mockProduct, trendScore: 85 }} />);
    let badge = screen.getByText('Hot').closest('span');
    expect(badge?.className).toContain('bg-red-500');

    // Test orange (>= 70 but < 80) - Badge still shows
    rerender(<ProductCard product={{ ...mockProduct, trendScore: 75 }} />);
    badge = screen.getByText('Hot').closest('span');
    expect(badge?.className).toContain('bg-orange-500');
  });
});
