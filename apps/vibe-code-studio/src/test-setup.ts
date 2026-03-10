/**
 * Vitest Test Setup
 * Configures browser APIs and global mocks for testing
 * Based on 2025 best practices for Vitest browser API mocking
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

import { setupClipboardMock } from './__tests__/mocks/clipboard';
import { setupMediaMocks } from './__tests__/mocks/media';
import { setupObserverMocks } from './__tests__/mocks/observers';
import { setupStorageMocks } from './__tests__/mocks/storage';

// Initialize mocks
setupClipboardMock();
setupObserverMocks();
const localStorageMock = setupStorageMocks();
setupMediaMocks();

/**
 * Mock HTMLElement.scrollIntoView
 * Required for focus management tests
 */
Element.prototype.scrollIntoView = vi.fn();

/**
 * Mock HTMLElement.focus
 * Track focus calls in tests
 */
const originalFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = vi.fn(function (this: HTMLElement) {
  originalFocus.call(this);
});

/**
 * Mock HTMLElement.blur
 * Track blur calls in tests
 */
const originalBlur = HTMLElement.prototype.blur;
HTMLElement.prototype.blur = vi.fn(function (this: HTMLElement) {
  originalBlur.call(this);
});

/**
 * Mock window.getComputedStyle
 * Required for style-dependent tests
 */
if (!window.getComputedStyle) {
  window.getComputedStyle = (_element: Element) => {
    return {
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration;
  };
}

/**
 * Suppress console errors during tests
 * Comment out during debugging
 */
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

/**
 * Clean up between tests
 */
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset localStorage
  localStorageMock.clear();

  // Reset clipboard
  (navigator.clipboard.writeText as any).mockClear();
  (navigator.clipboard.readText as any).mockClear();
});

afterEach(() => {
  // Additional cleanup if needed
  vi.clearAllTimers();
});
