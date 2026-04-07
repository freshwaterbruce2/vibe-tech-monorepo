import { configure } from '@testing-library/dom'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { createElement, forwardRef } from 'react'
import type { ReactNode } from 'react'

// Mock @vibetech/ui - this package is a workspace dependency that may not be linked
// Provide lightweight implementations of all exports used by components
vi.mock('@vibetech/ui', () => {
  const cn = (...args: unknown[]) =>
    args
      .flat()
      .filter((x) => typeof x === 'string' && x.trim())
      .join(' ')

  const makeComponent = (tag: string, displayName: string) => {
    const Comp = forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, className, ...props }, ref) =>
        createElement(tag, { ...props, className, ref }, children as ReactNode)
    )
    Comp.displayName = displayName
    return Comp
  }

  return {
    cn,
    Button: makeComponent('button', 'Button'),
    Card: makeComponent('div', 'Card'),
    CardContent: makeComponent('div', 'CardContent'),
    CardDescription: makeComponent('p', 'CardDescription'),
    CardHeader: makeComponent('div', 'CardHeader'),
    CardTitle: makeComponent('h3', 'CardTitle'),
    Badge: makeComponent('span', 'Badge'),
    Input: makeComponent('input', 'Input'),
    useToast: () => ({ toast: vi.fn() }),
    toast: vi.fn(),
  }
})

// Mock SpeechSynthesisUtterance for tests
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: class SpeechSynthesisUtterance {
    text: string
    volume: number
    rate: number
    pitch: number
    constructor(text?: string) {
      this.text = text ?? ''
      this.volume = 1
      this.rate = 1
      this.pitch = 1
    }
  },
  writable: true,
})

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  },
  writable: true,
})

// Configure testing-library
configure({
  testIdAttribute: 'data-testid',
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: readonly number[] = []

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 0) as unknown as number
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// Mock window.scroll
Object.defineProperty(window, 'scroll', {
  value: vi.fn(),
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
})

// Mock window.scrollBy
Object.defineProperty(window, 'scrollBy', {
  value: vi.fn(),
})

// Mock window.scrollIntoView
Element.prototype.scrollIntoView = vi.fn()
