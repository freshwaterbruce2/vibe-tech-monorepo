/**
 * HomePage Component Tests
 * @vitest-environment jsdom
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should render home page content', () => {
      render(<HomePage />);

      expect(screen.getByText('Vibe-shop Minimal')).toBeInTheDocument();
    });

    it('should render a div container', () => {
      const { container } = render(<HomePage />);

      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('should render without errors', () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });
  });

  // ============================================
  // BLOCK 2: Structure Tests
  // ============================================
  describe('Structure', () => {
    it('should have text content', () => {
      const { container } = render(<HomePage />);

      expect(container.textContent).toBe('Vibe-shop Minimal');
    });

    it('should export as default function', () => {
      expect(typeof HomePage).toBe('function');
    });

    it('should return valid JSX', () => {
      const result = HomePage();
      expect(result).toBeTruthy();
      expect(result.type).toBe('div');
    });
  });
});
