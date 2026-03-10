/**
 * ProductSkeleton Component Tests
 * @vitest-environment jsdom
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCardSkeleton, ProductGridSkeleton } from './product-skeleton';

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-footer" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe('ProductCardSkeleton', () => {
  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render a card container', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should have overflow-hidden class on card', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card')).toHaveClass('overflow-hidden');
    });

    it('should render card content section', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('should render card footer section', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card-footer')).toBeInTheDocument();
    });

    it('should render multiple skeleton elements', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should render exactly 6 skeleton elements', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      // 1 image + 4 content lines + 1 footer button = 6 skeletons
      expect(skeletons.length).toBe(6);
    });
  });

  // ============================================
  // BLOCK 2: Layout & Styling Tests
  // ============================================
  describe('Layout & Styling', () => {
    it('should have image placeholder with aspect-square', () => {
      const { container } = render(<ProductCardSkeleton />);

      const imageContainer = container.querySelector('.aspect-square');
      expect(imageContainer).toBeInTheDocument();
    });

    it('should have bg-muted on image placeholder', () => {
      const { container } = render(<ProductCardSkeleton />);

      const imageContainer = container.querySelector('.bg-muted');
      expect(imageContainer).toBeInTheDocument();
    });

    it('should have padding on card content', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card-content')).toHaveClass('p-4');
    });

    it('should have padding on card footer', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card-footer')).toHaveClass('p-4');
    });

    it('should have pt-0 on card footer to remove top padding', () => {
      render(<ProductCardSkeleton />);

      expect(screen.getByTestId('card-footer')).toHaveClass('pt-0');
    });

    it('should have full-width skeleton in footer', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      const footerSkeleton = skeletons[skeletons.length - 1];
      expect(footerSkeleton).toHaveClass('w-full');
    });
  });

  // ============================================
  // BLOCK 3: Skeleton Dimensions Tests
  // ============================================
  describe('Skeleton Dimensions', () => {
    it('should have full-height skeleton for image', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons[0]).toHaveClass('h-full', 'w-full');
    });

    it('should have category skeleton with specific dimensions', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Second skeleton is category (h-3 w-20)
      expect(skeletons[1]).toHaveClass('h-3', 'w-20');
    });

    it('should have title skeleton full width', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Third skeleton is title (h-5 w-full)
      expect(skeletons[2]).toHaveClass('h-5', 'w-full');
    });

    it('should have description skeleton 3/4 width', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Fourth skeleton is description (h-5 w-3/4)
      expect(skeletons[3]).toHaveClass('h-5', 'w-3/4');
    });

    it('should have price skeleton with specific dimensions', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Fifth skeleton is price (h-6 w-24)
      expect(skeletons[4]).toHaveClass('h-6', 'w-24');
    });

    it('should have footer button skeleton full width', () => {
      render(<ProductCardSkeleton />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Sixth skeleton is footer button (h-10 w-full)
      expect(skeletons[5]).toHaveClass('h-10', 'w-full');
    });
  });
});

describe('ProductGridSkeleton', () => {
  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render default 8 skeleton cards', () => {
      render(<ProductGridSkeleton />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(8);
    });

    it('should render custom number of skeleton cards', () => {
      render(<ProductGridSkeleton count={4} />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(4);
    });

    it('should render grid container', () => {
      const { container } = render(<ProductGridSkeleton />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have responsive grid columns', () => {
      const { container } = render(<ProductGridSkeleton />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('sm:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
      expect(grid).toHaveClass('xl:grid-cols-4');
    });

    it('should have gap between cards', () => {
      const { container } = render(<ProductGridSkeleton />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-6');
    });
  });

  // ============================================
  // BLOCK 2: Count Parameter Tests
  // ============================================
  describe('Count Parameter', () => {
    it('should render 1 card when count is 1', () => {
      render(<ProductGridSkeleton count={1} />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(1);
    });

    it('should render 12 cards when count is 12', () => {
      render(<ProductGridSkeleton count={12} />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(12);
    });

    it('should render 0 cards when count is 0', () => {
      render(<ProductGridSkeleton count={0} />);

      const cards = screen.queryAllByTestId('card');
      expect(cards.length).toBe(0);
    });

    it('should handle large count', () => {
      render(<ProductGridSkeleton count={100} />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(100);
    });
  });

  // ============================================
  // BLOCK 3: Key Prop Tests
  // ============================================
  describe('Key Props', () => {
    it('should render cards with unique keys (no duplicates)', () => {
      const { container } = render(<ProductGridSkeleton count={5} />);

      const grid = container.querySelector('.grid');
      expect(grid?.children.length).toBe(5);

      // All children should be present (no React key warning)
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(5);
    });
  });

  // ============================================
  // BLOCK 4: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should use default count when not provided', () => {
      render(<ProductGridSkeleton />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(8);
    });

    it('should render each card with proper structure', () => {
      render(<ProductGridSkeleton count={2} />);

      const cards = screen.getAllByTestId('card');
      const cardContents = screen.getAllByTestId('card-content');
      const cardFooters = screen.getAllByTestId('card-footer');

      expect(cards.length).toBe(2);
      expect(cardContents.length).toBe(2);
      expect(cardFooters.length).toBe(2);
    });

    it('should maintain grid structure with odd number of cards', () => {
      const { container } = render(<ProductGridSkeleton count={5} />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(screen.getAllByTestId('card').length).toBe(5);
    });

    it('should maintain grid structure with single card', () => {
      const { container } = render(<ProductGridSkeleton count={1} />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1');
    });
  });
});
