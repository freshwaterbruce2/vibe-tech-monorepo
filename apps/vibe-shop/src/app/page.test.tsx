/**
 * HomePage Component Tests
 * @vitest-environment jsdom
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 *
 * Note: HomePage is an async React Server Component (Next.js 15 App Router)
 * that uses Prisma directly. We mock Prisma and render the resolved output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  },
}));

// Mock child components
vi.mock('@/components/layout/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/products/product-grid', () => ({
  ProductGrid: ({ products }: { products: Array<{ id: string }> }) => (
    <div data-testid="product-grid" data-count={products.length}>
      ProductGrid
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => {
    if (asChild) {
      return <>{children}</>;
    }
    return (
      <button data-testid="button" {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render home page content', async () => {
      const { default: HomePage } = await import('./page');
      const Component = await HomePage();
      render(Component);

      expect(screen.getByText('Trending Now')).toBeInTheDocument();
    });

    it('should render the hero heading', async () => {
      const { default: HomePage } = await import('./page');
      const Component = await HomePage();
      render(Component);

      expect(screen.getByText('trending products')).toBeInTheDocument();
    });

    it('should render without errors', async () => {
      const { default: HomePage } = await import('./page');
      await expect(HomePage()).resolves.toBeTruthy();
    });
  });

  // ============================================
  // BLOCK 2: Structure Tests
  // ============================================
  describe('Structure', () => {
    it('should render the Header component', async () => {
      const { default: HomePage } = await import('./page');
      const Component = await HomePage();
      render(Component);

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should export as default function', async () => {
      const { default: HomePage } = await import('./page');
      expect(typeof HomePage).toBe('function');
    });

    it('should render the ProductGrid component', async () => {
      const { default: HomePage } = await import('./page');
      const Component = await HomePage();
      render(Component);

      expect(screen.getByTestId('product-grid')).toBeInTheDocument();
    });
  });
});
