/**
 * SyncButton Component Tests
 * @vitest-environment jsdom
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncButton } from './sync-button';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">Play</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
}));

describe('SyncButton', () => {
  let originalFetch: typeof global.fetch;
  let originalAlert: typeof window.alert;
  let originalReload: typeof window.location.reload;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalAlert = window.alert;

    // Mock window.location.reload
    const mockLocation = {
      ...window.location,
      reload: vi.fn(),
    };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });
    originalReload = window.location.reload;

    // Mock alert
    window.alert = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.alert = originalAlert;
    vi.clearAllMocks();
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render button with correct initial text', () => {
      render(<SyncButton />);

      expect(screen.getByRole('button')).toHaveTextContent('Trigger Discovery Now');
    });

    it('should render play icon when not loading', () => {
      render(<SyncButton />);

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should not show last run time initially', () => {
      render(<SyncButton />);

      expect(screen.queryByText(/Last run:/)).not.toBeInTheDocument();
    });

    it('should be enabled initially', () => {
      render(<SyncButton />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should trigger sync on button click', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/cron/discovery');
      });
    });

    it('should show success alert on successful sync', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Sync triggered successfully!');
      });
    });

    it('should reload page on successful sync', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      });
    });

    it('should display last run time after successful sync', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/Last run:/)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // BLOCK 2: Loading State Tests
  // ============================================
  describe('Loading State', () => {
    it('should show loading text while syncing', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(fetchPromise);

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      // Check loading state
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent('Running Discovery...');
      });

      // Resolve the fetch
      resolvePromise!({
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should show refresh icon while loading', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(fetchPromise);

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      });

      resolvePromise!({
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should disable button while loading', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(fetchPromise);

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });

      resolvePromise!({
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should re-enable button after sync completes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });
  });

  // ============================================
  // BLOCK 3: Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should show error alert when sync fails with message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          success: false,
          message: 'API rate limit exceeded'
        }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Sync failed: API rate limit exceeded');
      });
    });

    it('should show generic error alert on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error triggering sync');
      });
    });

    it('should not reload page on sync failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          success: false,
          message: 'Failed'
        }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });

      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it('should not update last run time on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          success: false,
          message: 'Failed'
        }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Last run:/)).not.toBeInTheDocument();
    });

    it('should re-enable button after error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });

    it('should handle JSON parse error gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error triggering sync');
      });
    });
  });

  // ============================================
  // BLOCK 4: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should prevent double-click during loading', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(fetchPromise);

      render(<SyncButton />);

      const button = screen.getByRole('button');

      // First click
      fireEvent.click(button);

      // Wait for loading state
      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Second click should not trigger another fetch
      fireEvent.click(button);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      resolvePromise!({
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should handle undefined message in failure response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: false }),
      });

      render(<SyncButton />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Sync failed: undefined');
      });
    });

    it('should render within flex container', () => {
      const { container } = render(<SyncButton />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-4');
    });
  });
});
