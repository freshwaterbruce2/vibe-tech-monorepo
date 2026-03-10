/**
 * AdminDashboard Page Tests
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
    syncLog: {
      findMany: vi.fn(),
    },
  },
}));

// Mock child components
vi.mock('@/components/admin/stats-cards', () => ({
  StatsCards: () => <div data-testid="stats-cards">StatsCards</div>,
}));

vi.mock('@/components/admin/sync-button', () => ({
  SyncButton: () => <div data-testid="sync-button">SyncButton</div>,
}));

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render dashboard header', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('should render dashboard description', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('Manage your affiliate store automation')).toBeInTheDocument();
    });

    it('should render SyncButton component', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByTestId('sync-button')).toBeInTheDocument();
    });

    it('should render StatsCards component', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
    });

    it('should render Recent Sync Logs card', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('Recent Sync Logs')).toBeInTheDocument();
    });

    it('should fetch sync logs with correct parameters', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      await AdminDashboard();

      expect(prisma.syncLog.findMany).toHaveBeenCalledWith({
        orderBy: { startedAt: 'desc' },
        take: 10,
      });
    });
  });

  // ============================================
  // BLOCK 2: Sync Log Display Tests
  // ============================================
  describe('Sync Log Display', () => {
    it('should show "No logs yet" when logs array is empty', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('No logs yet.')).toBeInTheDocument();
    });

    it('should display sync log with success status', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'success',
          startedAt: new Date('2026-01-15T10:00:00'),
          completedAt: new Date('2026-01-15T10:05:00'),
          productsAdded: 25,
          errorMessage: null,
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('products Sync')).toBeInTheDocument();
      expect(screen.getByText('+25 Products')).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
    });

    it('should display sync log with error status', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '2',
          syncType: 'trends',
          status: 'failed',
          startedAt: new Date('2026-01-15T11:00:00'),
          completedAt: null,
          productsAdded: 0,
          errorMessage: 'API rate limit exceeded',
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('trends Sync')).toBeInTheDocument();
      expect(screen.getByText('Error: API rate limit exceeded')).toBeInTheDocument();
    });

    it('should display running status with animation', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '3',
          syncType: 'full',
          status: 'running',
          startedAt: new Date('2026-01-15T12:00:00'),
          completedAt: null,
          productsAdded: 10,
          errorMessage: null,
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      // Check for the blue animated pulse indicator
      const runningIndicator = container.querySelector('.bg-blue-500.animate-pulse');
      expect(runningIndicator).toBeInTheDocument();
    });

    it('should display multiple sync logs', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'success',
          startedAt: new Date('2026-01-15T10:00:00'),
          completedAt: new Date('2026-01-15T10:05:00'),
          productsAdded: 25,
          errorMessage: null,
        },
        {
          id: '2',
          syncType: 'trends',
          status: 'success',
          startedAt: new Date('2026-01-15T09:00:00'),
          completedAt: new Date('2026-01-15T09:03:00'),
          productsAdded: 15,
          errorMessage: null,
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      expect(screen.getByText('products Sync')).toBeInTheDocument();
      expect(screen.getByText('trends Sync')).toBeInTheDocument();
      expect(screen.getByText('+25 Products')).toBeInTheDocument();
      expect(screen.getByText('+15 Products')).toBeInTheDocument();
    });
  });

  // ============================================
  // BLOCK 3: Status Indicator Tests
  // ============================================
  describe('Status Indicators', () => {
    it('should show green indicator for success status', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          productsAdded: 10,
          errorMessage: null,
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      const greenIndicator = container.querySelector('.bg-green-500');
      expect(greenIndicator).toBeInTheDocument();
    });

    it('should show red indicator for failed status', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'failed',
          startedAt: new Date(),
          completedAt: null,
          productsAdded: 0,
          errorMessage: 'Error',
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      const redIndicator = container.querySelector('.bg-red-500');
      expect(redIndicator).toBeInTheDocument();
    });

    it('should show blue pulsing indicator for running status', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'running',
          startedAt: new Date(),
          completedAt: null,
          productsAdded: 5,
          errorMessage: null,
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      const blueIndicator = container.querySelector('.bg-blue-500');
      expect(blueIndicator).toBeInTheDocument();
      expect(blueIndicator).toHaveClass('animate-pulse');
    });

    it('should show destructive badge for error message', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'failed',
          startedAt: new Date(),
          completedAt: null,
          productsAdded: 0,
          errorMessage: 'Connection timeout',
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      render(Component);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-variant', 'destructive');
    });
  });

  // ============================================
  // BLOCK 4: Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should propagate Prisma errors', async () => {
      vi.mocked(prisma.syncLog.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      const { default: AdminDashboard } = await import('./page');

      await expect(AdminDashboard()).rejects.toThrow('Database connection failed');
    });
  });

  // ============================================
  // BLOCK 5: Layout Tests
  // ============================================
  describe('Layout', () => {
    it('should have container class', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      expect(container.querySelector('.container')).toBeInTheDocument();
    });

    it('should have space-y-8 for vertical spacing', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      expect(container.querySelector('.space-y-8')).toBeInTheDocument();
    });

    it('should have py-8 for vertical padding', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      expect(container.querySelector('.py-8')).toBeInTheDocument();
    });

    it('should render log items with border and rounded corners', async () => {
      vi.mocked(prisma.syncLog.findMany).mockResolvedValue([
        {
          id: '1',
          syncType: 'products',
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          productsAdded: 10,
          errorMessage: null,
        },
      ]);

      const { default: AdminDashboard } = await import('./page');
      const Component = await AdminDashboard();
      const { container } = render(Component);

      const logItem = container.querySelector('.border.rounded-lg');
      expect(logItem).toBeInTheDocument();
    });
  });
});
