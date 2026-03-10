/**
 * AffiliateDisclosure Component Tests
 * @vitest-environment jsdom
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AffiliateDisclosure } from './affiliate-disclosure';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Info: () => <span data-testid="info-icon">Info</span>,
  X: () => <span data-testid="x-icon">X</span>,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('AffiliateDisclosure', () => {
  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render disclosure banner by default', () => {
      render(<AffiliateDisclosure />);

      expect(screen.getByText(/Affiliate Disclosure:/)).toBeInTheDocument();
    });

    it('should display disclosure message', () => {
      render(<AffiliateDisclosure />);

      expect(screen.getByText(/We may earn a commission when you purchase through our links./)).toBeInTheDocument();
    });

    it('should render learn more link', () => {
      render(<AffiliateDisclosure />);

      const link = screen.getByRole('link', { name: /learn more/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/affiliate-disclosure');
    });

    it('should render info icon', () => {
      render(<AffiliateDisclosure />);

      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('should render dismiss button', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button', { name: /dismiss disclaimer/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should render X icon in dismiss button', () => {
      render(<AffiliateDisclosure />);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  // ============================================
  // BLOCK 2: Dismiss Functionality Tests
  // ============================================
  describe('Dismiss Functionality', () => {
    it('should hide banner when dismiss button is clicked', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button', { name: /dismiss disclaimer/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByText(/Affiliate Disclosure:/)).not.toBeInTheDocument();
    });

    it('should return null after dismissal', () => {
      const { container } = render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button', { name: /dismiss disclaimer/i });
      fireEvent.click(dismissButton);

      expect(container.firstChild).toBeNull();
    });

    it('should hide learn more link after dismissal', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button', { name: /dismiss disclaimer/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByRole('link', { name: /learn more/i })).not.toBeInTheDocument();
    });

    it('should hide info icon after dismissal', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button', { name: /dismiss disclaimer/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument();
    });

    it('should hide dismiss button itself after click', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button', { name: /dismiss disclaimer/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByRole('button', { name: /dismiss disclaimer/i })).not.toBeInTheDocument();
    });
  });

  // ============================================
  // BLOCK 3: Styling & Accessibility Tests
  // ============================================
  describe('Styling & Accessibility', () => {
    it('should have proper container styling', () => {
      const { container } = render(<AffiliateDisclosure />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('bg-amber-50');
      expect(wrapper).toHaveClass('border-b');
    });

    it('should have dark mode classes', () => {
      const { container } = render(<AffiliateDisclosure />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('dark:bg-amber-950/30');
      expect(wrapper).toHaveClass('dark:border-amber-800');
    });

    it('should have accessible dismiss button with aria-label', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss disclaimer');
    });

    it('should have hover styles on dismiss button', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveClass('hover:bg-amber-200');
      expect(dismissButton).toHaveClass('dark:hover:bg-amber-800');
    });

    it('should have underline on learn more link', () => {
      render(<AffiliateDisclosure />);

      const link = screen.getByRole('link', { name: /learn more/i });
      expect(link).toHaveClass('underline');
    });

    it('should have hover:no-underline on learn more link', () => {
      render(<AffiliateDisclosure />);

      const link = screen.getByRole('link', { name: /learn more/i });
      expect(link).toHaveClass('hover:no-underline');
    });

    it('should have container class for layout', () => {
      const { container } = render(<AffiliateDisclosure />);

      const innerContainer = container.querySelector('.container');
      expect(innerContainer).toBeInTheDocument();
    });

    it('should use flex layout for content', () => {
      const { container } = render(<AffiliateDisclosure />);

      const innerContainer = container.querySelector('.container');
      expect(innerContainer).toHaveClass('flex');
      expect(innerContainer).toHaveClass('items-center');
      expect(innerContainer).toHaveClass('justify-between');
    });
  });

  // ============================================
  // BLOCK 4: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should render strong text for "Affiliate Disclosure:"', () => {
      render(<AffiliateDisclosure />);

      const strongElement = screen.getByText('Affiliate Disclosure:');
      expect(strongElement.tagName).toBe('STRONG');
    });

    it('should maintain visibility state across interactions', () => {
      render(<AffiliateDisclosure />);

      // Initially visible
      expect(screen.getByText(/Affiliate Disclosure:/)).toBeInTheDocument();

      // Dismiss
      fireEvent.click(screen.getByRole('button'));

      // Should stay hidden
      expect(screen.queryByText(/Affiliate Disclosure:/)).not.toBeInTheDocument();
    });

    it('should have proper text sizing', () => {
      const { container } = render(<AffiliateDisclosure />);

      const textContainer = container.querySelector('.text-sm');
      expect(textContainer).toBeInTheDocument();
    });

    it('should have padding on container', () => {
      const { container } = render(<AffiliateDisclosure />);

      const innerContainer = container.querySelector('.container');
      expect(innerContainer).toHaveClass('py-2');
    });

    it('should have gap between flex items', () => {
      const { container } = render(<AffiliateDisclosure />);

      const innerContainer = container.querySelector('.container');
      expect(innerContainer).toHaveClass('gap-4');
    });

    it('should have transition on dismiss button', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveClass('transition-colors');
    });

    it('should have rounded corners on dismiss button', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveClass('rounded');
    });

    it('should have padding on dismiss button', () => {
      render(<AffiliateDisclosure />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveClass('p-1');
    });
  });
});
