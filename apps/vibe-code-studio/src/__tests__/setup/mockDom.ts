import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';

// Add custom jest-dom matchers
expect.extend(matchers);

// Mock environment variables
if (typeof process !== 'undefined') {
  process.env['REACT_APP_DEEPSEEK_API_KEY'] = 'demo_key';
  process.env['REACT_APP_DEEPSEEK_BASE_URL'] = 'https://api.deepseek.com/v1';
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock PointerEvent
if (typeof global.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.tangentialPressure = params.tangentialPressure ?? 0;
      this.tiltX = params.tiltX ?? 0;
      this.tiltY = params.tiltY ?? 0;
      this.twist = params.twist ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary !== undefined ? params.isPrimary : true;
    }
  }
  global.PointerEvent = PointerEvent as any;
}

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// Mock console methods
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  const message = args[0]?.toString() ?? '';
  if (
    message.includes('Warning: ReactDOM.render is no longer supported') ||
    message.includes('Error: Uncaught') ||
    message.includes('Consider adding an error boundary')
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() ?? '';
  if (message.includes('componentWillReceiveProps') || message.includes('componentWillUpdate')) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Mock Worker API
(global as any).Worker = class Worker {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  postMessage(msg: any) {
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { type: 'response', payload: msg } });
      }
    }, 0);
  }

  terminate() {}

  addEventListener(type: string, listener: any) {
    if (type === 'message') {
      this.onmessage = listener;
    } else if (type === 'error') {
      this.onerror = listener;
    }
  }

  removeEventListener() {}
};
