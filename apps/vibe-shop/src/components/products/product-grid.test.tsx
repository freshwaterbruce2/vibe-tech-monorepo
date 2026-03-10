import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductGrid } from './product-grid';
import type { Product } from '@/types';

// Mock ProductCard component
vi.mock('./product-card', () => ({
  ProductCard: ({
    product,
    rank,
  }: {
    product: Product;
    rank?: number;
  }) => (
    <div data-testid={`product-card-${product.id}`}>
      <span>{product.name}</span>
      {rank && <span data-testid="rank">#{rank}</span>}
    </div>
  ),
}));

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    externalId: 'ext-1',
    network: 'shareasale',
    name: 'Product 1',
    description: 'Description 1',
    price: 99.99,
    currency: 'USD',
    imageUrl: 'https://example.com/1.jpg',
    affiliateLink: 'https://example.com/aff1',
    categoryId: 'electronics',
    trendScore: 85,
    commissionRate: 10,
    merchantName: 'Merchant 1',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    expiresAt: null,
  },
  {
    id: 'prod-2',
    externalId: 'ext-2',
    network: 'shareasale',
    name: 'Product 2',
    description: 'Description 2',
    price: 149.99,
    currency: 'USD',
    imageUrl: 'https://example.com/2.jpg',
    affiliateLink: 'https://example.com/aff2',
    categoryId: 'electronics',
    trendScore: 75,
    commissionRate: 12,
    merchantName: 'Merchant 2',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    expiresAt: null,
  },
  {
    id: 'prod-3',
    externalId: 'ext-3',
    network: 'shareasale',
    name: 'Product 3',
    description: 'Description 3',
    price: 199.99,
    currency: 'USD',
    imageUrl: 'https://example.com/3.jpg',
    affiliateLink: 'https://example.com/aff3',
    categoryId: 'home-garden',
    trendScore: 90,
    commissionRate: 8,
    merchantName: 'Merchant 3',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    expiresAt: null,
  },
];

describe('ProductGrid', () => {
  it('renders without crashing', () => {
    render(<ProductGrid products={mockProducts} />);
    expect(screen.getByTestId('product-card-prod-1')).toBeInTheDocument();
  });

  it('displays all products', () => {
    render(<ProductGrid products={mockProducts} />);
    expect(screen.getByTestId('product-card-prod-1')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-prod-2')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-prod-3')).toBeInTheDocument();
  });

  it('displays product names', () => {
    render(<ProductGrid products={mockProducts} />);
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Product 3')).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    render(<ProductGrid products={[]} />);
    expect(
      screen.getByText('No products found. Check back soon for trending deals!')
    ).toBeInTheDocument();
  });

  it('does not render ProductCard when no products', () => {
    render(<ProductGrid products={[]} />);
    expect(screen.queryByTestId(/^product-card-/)).not.toBeInTheDocument();
  });

  it('does not show ranking when showRanking is false', () => {
    render(<ProductGrid products={mockProducts} showRanking={false} />);
    expect(screen.queryByTestId('rank')).not.toBeInTheDocument();
  });

  it('shows ranking when showRanking is true', () => {
    render(<ProductGrid products={mockProducts} showRanking={true} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('assigns correct rank numbers starting from 1', () => {
    render(<ProductGrid products={mockProducts} showRanking={true} />);
    const ranks = screen.getAllByTestId('rank');
    expect(ranks[0]).toHaveTextContent('#1');
    expect(ranks[1]).toHaveTextContent('#2');
    expect(ranks[2]).toHaveTextContent('#3');
  });

  it('renders products in the order provided', () => {
    render(<ProductGrid products={mockProducts} showRanking={true} />);
    const productCards = screen.getAllByTestId(/^product-card-/);
    expect(productCards[0]).toHaveAttribute('data-testid', 'product-card-prod-1');
    expect(productCards[1]).toHaveAttribute('data-testid', 'product-card-prod-2');
    expect(productCards[2]).toHaveAttribute('data-testid', 'product-card-prod-3');
  });

  it('applies grid layout class', () => {
    const { container } = render(<ProductGrid products={mockProducts} />);
    const gridElement = container.querySelector('.grid');
    expect(gridElement).toBeInTheDocument();
    expect(gridElement?.className).toContain('grid-cols-1');
    expect(gridElement?.className).toContain('sm:grid-cols-2');
    expect(gridElement?.className).toContain('lg:grid-cols-3');
    expect(gridElement?.className).toContain('xl:grid-cols-4');
  });

  it('handles single product', () => {
    render(<ProductGrid products={[mockProducts[0]]} />);
    expect(screen.getByTestId('product-card-prod-1')).toBeInTheDocument();
    expect(screen.queryByTestId('product-card-prod-2')).not.toBeInTheDocument();
  });

  it('handles large number of products', () => {
    const manyProducts = Array.from({ length: 20 }, (_, i) => ({
      ...mockProducts[0],
      id: `prod-${i}`,
      name: `Product ${i}`,
    }));
    render(<ProductGrid products={manyProducts} />);
    expect(screen.getAllByTestId(/^product-card-/).length).toBe(20);
  });
});
