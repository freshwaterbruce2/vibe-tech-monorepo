/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from '../contexts/UserContext'
import { DoorSchedule } from '../types/shipping'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UserProvider>{children}</UserProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Test utilities for common actions
export const createMockDoorEntry = (overrides = {}): DoorSchedule => ({
  id: '1',
  doorNumber: 332,
  destinationDC: '6024',
  freightType: '23/43',
  trailerStatus: 'partial',
  timestamp: new Date().toISOString(),
  notes: '',
  palletCount: 0,
  createdBy: 'Test User',
  tcrPresent: false,
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@walmart.com',
  displayName: 'Test User',
  ...overrides,
})

// Mock localStorage for tests
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {}

  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach(key => delete storage[key])
    },
    key: (index: number) => Object.keys(storage)[index] || null,
    get length() {
      return Object.keys(storage).length
    },
  }
}

// Mock IndexedDB for tests
export const mockIndexedDB = () => {
  const _databases: Record<string, any> = {}

  return {
    open: vi.fn().mockImplementation((_name: string) => {
      const request = {
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              put: vi.fn(),
              get: vi.fn(),
              delete: vi.fn(),
              clear: vi.fn(),
            }),
          }),
          createObjectStore: vi.fn(),
        },
        onsuccess: null as ((this: IDBRequest, ev: Event) => any) | null,
        onerror: null as ((this: IDBRequest, ev: Event) => any) | null,
        onupgradeneeded: null as
          | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any)
          | null,
      }

      setTimeout(() => {
        if (request.onsuccess) {
          const event = new Event('success')
          Object.defineProperty(event, 'target', {
            value: request,
            enumerable: true,
          })
          request.onsuccess.call(request as unknown as IDBRequest, event)
        }
      }, 0)

      return request as unknown as IDBOpenDBRequest
    }),
  }
}

// Helper to wait for async operations
export const waitForLoadingToFinish = async () =>
  new Promise(resolve => setTimeout(resolve, 0))

// Mock Speech Recognition API
export const mockSpeechRecognition = () => {
  const SpeechRecognitionMock = vi.fn().mockImplementation(() => ({
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onstart: null,
    onend: null,
    onresult: null,
    onerror: null,
  }))

  Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    value: SpeechRecognitionMock,
  })

  Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: SpeechRecognitionMock,
  })

  return SpeechRecognitionMock
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
