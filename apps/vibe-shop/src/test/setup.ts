import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock matchMedia (only when window is available)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: vi.fn((props: any) => null),
}));

// Mock lucide-react icons with importOriginal to include all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const createMockIcon = (name: string) => {
    const MockIcon = (props: any) => {
      return createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, ...props }, name);
    };
    MockIcon.displayName = name;
    return MockIcon;
  };

  return {
    ...actual,
    ShoppingCart: createMockIcon('ShoppingCart'),
    Heart: createMockIcon('Heart'),
    Search: createMockIcon('Search'),
    Menu: createMockIcon('Menu'),
    X: createMockIcon('X'),
    XIcon: createMockIcon('XIcon'),
    ChevronDown: createMockIcon('ChevronDown'),
    Star: createMockIcon('Star'),
    Filter: createMockIcon('Filter'),
    Plus: createMockIcon('Plus'),
    Minus: createMockIcon('Minus'),
    Check: createMockIcon('Check'),
    AlertCircle: createMockIcon('AlertCircle'),
    Package: createMockIcon('Package'),
    Truck: createMockIcon('Truck'),
    ExternalLink: createMockIcon('ExternalLink'),
    TrendingUp: createMockIcon('TrendingUp'),
    Clock: createMockIcon('Clock'),
    Flame: createMockIcon('Flame'),
  };
});
