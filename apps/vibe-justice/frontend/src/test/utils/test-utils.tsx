import { render, renderHook as rtlRenderHook } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// React 19: act is now exported from 'react' directly
import { act } from 'react'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface AllTheProvidersProps {
  children: ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const testQueryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export renderHook with wrapper
const customRenderHook = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
) => rtlRenderHook(hook, { wrapper: AllTheProviders, ...options })

// Re-export everything from @testing-library/react
export * from '@testing-library/react'

// Explicitly re-export commonly used items for TypeScript
export { screen, fireEvent, waitFor, within } from '@testing-library/react'

// Override with custom implementations
export { customRender as render, customRenderHook as renderHook, act }
