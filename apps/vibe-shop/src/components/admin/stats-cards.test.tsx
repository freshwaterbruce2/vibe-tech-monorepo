/**
 * StatsCards Component Tests
 * @vitest-environment jsdom
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 *
 * Note: This is an async React Server Component that uses Prisma directly.
 * We test by mocking Prisma and rendering the component output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      count: vi.fn(),
    },
    trendingKeyword: {
      count: vi.fn(),
    },
    category: {
      count: vi.fn(),
    },
    click: {
      count: vi.fn(),
    },
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Activity: () => <span data-testid="icon-activity">Activity</span>,
  BarChart3: () => <span data-testid="icon-barchart">BarChart</span>,
  Package: () => <span data-testid="icon-package">Package</span>,
  TrendingUp: () => <span data-testid="icon-trending">TrendingUp</span>,
}));

// Import after mocks
import { prisma } from '@/lib/prisma';

describe('StatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render all four stat cards', async () => {
      // Setup mocks
      vi.mocked(prisma.product.count).mockResolvedValue(150);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(25);
      vi.mocked(prisma.category.count).mockResolvedValue(8);
      vi.mocked(prisma.click.count).mockResolvedValue(42);

      // Dynamic import to get fresh module with mocks
      const { StatsCards } = await import('./stats-cards');

      // Render the async component
      const Component = await StatsCards();
      render(Component);

      // Verify all cards are rendered
      expect(screen.getByText('Active Products')).toBeInTheDocument();
      expect(screen.getByText('Trending Keywords')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    });

    it('should display correct product count', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(42);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(10);
      vi.mocked(prisma.category.count).mockResolvedValue(5);
      vi.mocked(prisma.click.count).mockResolvedValue(99);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display correct trend keyword count', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(100);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(33);
      vi.mocked(prisma.category.count).mockResolvedValue(7);
      vi.mocked(prisma.click.count).mockResolvedValue(50);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      expect(screen.getByText('33')).toBeInTheDocument();
    });

    it('should display correct category count', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(50);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(15);
      vi.mocked(prisma.category.count).mockResolvedValue(12);
      vi.mocked(prisma.click.count).mockResolvedValue(200);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display correct click count', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(100);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(20);
      vi.mocked(prisma.category.count).mockResolvedValue(6);
      vi.mocked(prisma.click.count).mockResolvedValue(83);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      expect(screen.getByText('83')).toBeInTheDocument();
    });

    it('should display card descriptions', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(10);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(5);
      vi.mocked(prisma.category.count).mockResolvedValue(3);
      vi.mocked(prisma.click.count).mockResolvedValue(7);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      expect(screen.getByText('Live in store')).toBeInTheDocument();
      expect(screen.getByText('Tracked daily')).toBeInTheDocument();
      expect(screen.getByText('Active categories')).toBeInTheDocument();
      expect(screen.getByText('Affiliate clicks')).toBeInTheDocument();
    });
  });

  // ============================================
  // BLOCK 2: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle zero counts', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(0);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(0);
      vi.mocked(prisma.category.count).mockResolvedValue(0);
      vi.mocked(prisma.click.count).mockResolvedValue(0);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      // Should display "0" for all counts
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });

    it('should display Total Clicks card', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(10);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(5);
      vi.mocked(prisma.category.count).mockResolvedValue(3);
      vi.mocked(prisma.click.count).mockResolvedValue(127);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      const clicksCard = screen.getByText('Total Clicks').closest('div');
      expect(clicksCard).toBeInTheDocument();
      expect(screen.getByText('127')).toBeInTheDocument();
    });

    it('should handle large numbers', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(999999);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(50000);
      vi.mocked(prisma.category.count).mockResolvedValue(100);
      vi.mocked(prisma.click.count).mockResolvedValue(12345);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      const { container } = render(Component);

      // Large numbers are rendered as text content
      expect(container.textContent).toContain('999999');
      expect(container.textContent).toContain('50000');
      expect(container.textContent).toContain('100');
    });

    it('should render 4 cards in grid layout', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(1);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(1);
      vi.mocked(prisma.category.count).mockResolvedValue(1);
      vi.mocked(prisma.click.count).mockResolvedValue(1);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      const { container } = render(Component);

      // Check grid container exists
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should only count active products', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(75);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(20);
      vi.mocked(prisma.category.count).mockResolvedValue(8);
      vi.mocked(prisma.click.count).mockResolvedValue(300);

      const { StatsCards } = await import('./stats-cards');
      await StatsCards();

      // Verify count was called with isActive filter
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  // ============================================
  // BLOCK 3: Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should propagate Prisma errors', async () => {
      vi.mocked(prisma.product.count).mockRejectedValue(new Error('Database connection failed'));

      const { StatsCards } = await import('./stats-cards');

      // Component should throw since it's a server component
      await expect(StatsCards()).rejects.toThrow('Database connection failed');
    });

    it('should handle click count errors', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(10);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(5);
      vi.mocked(prisma.category.count).mockResolvedValue(3);
      vi.mocked(prisma.click.count).mockRejectedValue(new Error('Click count failed'));

      const { StatsCards } = await import('./stats-cards');

      await expect(StatsCards()).rejects.toThrow('Click count failed');
    });

    it('should display Total Clicks title', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(10);
      vi.mocked(prisma.trendingKeyword.count).mockResolvedValue(5);
      vi.mocked(prisma.category.count).mockResolvedValue(3);
      vi.mocked(prisma.click.count).mockResolvedValue(0);

      const { StatsCards } = await import('./stats-cards');
      const Component = await StatsCards();
      render(Component);

      expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    });
  });
});
