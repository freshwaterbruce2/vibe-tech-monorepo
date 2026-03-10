import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock matchMedia
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
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  disconnect() {}
  observe() {}
  takeRecords() { return [] }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: vi.fn(({ children }: any) => children),
  Line: vi.fn(() => null),
  XAxis: vi.fn(() => null),
  YAxis: vi.fn(() => null),
  CartesianGrid: vi.fn(() => null),
  Tooltip: vi.fn(() => null),
  Legend: vi.fn(() => null),
  BarChart: vi.fn(({ children }: any) => children),
  Bar: vi.fn(() => null),
  AreaChart: vi.fn(({ children }: any) => children),
  Area: vi.fn(() => null),
}))

// Mock lucide-react icons - returns a div to support querySelector
vi.mock('lucide-react', async () => {
  const { createElement } = await import('react')
  const MockIcon = (props: any) => createElement('div', {
    className: `lucide-icon animate-spin ${props.className || ''}`.trim(),
    'data-testid': 'lucide-icon'
  })

  return {
    TrendingUp: MockIcon,
    TrendingDown: MockIcon,
    Minus: MockIcon,
    Package: MockIcon,
    Activity: MockIcon,
    CheckCircle: MockIcon,
    CheckCircle2: MockIcon,
    AlertCircle: MockIcon,
    AlertTriangle: MockIcon,
    Clock: MockIcon,
    Database: MockIcon,
    FileText: MockIcon,
    GitBranch: MockIcon,
    Zap: MockIcon,
    Loader2: MockIcon,
    XCircle: MockIcon,
    Play: MockIcon,
    Square: MockIcon,
    Settings: MockIcon,
    ArrowUp: MockIcon,
    ArrowDown: MockIcon,
    LineChart: MockIcon,
    BarChart3: MockIcon,
  }
})
