/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

// PWA-specific loading states
const _PWALoader = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  </div>
)

const FormLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
)

const TableLoader = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-12 bg-gray-200 rounded"></div>
    <div className="h-8 bg-gray-100 rounded"></div>
    <div className="h-8 bg-gray-100 rounded"></div>
    <div className="h-8 bg-gray-100 rounded"></div>
  </div>
)

// Lazy loaded routes for PWA
export const LazyPalletCounter = lazy(
  async () => import('../../pages/PalletCounter')
)
export const LazyNotes = lazy(async () => import('../../pages/Notes'))
export const LazySettings = lazy(async () => import('../../pages/Settings'))

// Admin components (low priority)
export const LazyWarehouseSetup = lazy(
  async () => import('../../components/admin/WarehouseSetup')
)
export const LazyAdminDashboard = lazy(async () =>
  import('../../components/admin/AdminDashboard').then(module => ({
    default: module.AdminDashboard,
  }))
)

// Lazy loaded components
export const LazyDataExport = lazy(
  async () => import('../../components/export/DataExport')
)
export const LazyPalletExport = lazy(
  async () => import('../../components/pallets/PalletExport')
)
export const LazyVoiceSettings = lazy(
  async () => import('../../components/settings/VoiceSettings')
)
export const LazyInteractionSettings = lazy(
  async () => import('../../components/settings/InteractionSettings')
)
export const LazyVoiceTestPage = lazy(async () =>
  import('../../components/voice/VoiceTestPage').then(m => ({
    default: m.VoiceTestPage,
  }))
)
export const LazyVoiceTutorial = lazy(
  async () => import('../../components/voice/VoiceTutorial')
)

// Onboarding wizard (only shown once)
export const LazyWelcomeWizard = lazy(
  async () => import('../../components/onboarding/WelcomeWizard')
)

// Voice command help (conditional loading)
export const LazyVoiceCommandHelp = lazy(
  async () => import('../../components/voice/VoiceCommandHelp')
)

// Component wrappers with PWA-specific loading states
export const LazyFormWrapper = ({ children, className }: {
  children: ReactNode
  className?: string
}) => (
  <Suspense fallback={<FormLoader />}>
    <div className={className}>{children}</div>
  </Suspense>
)

export const LazyTableWrapper = ({ children, className }: {
  children: ReactNode
  className?: string
}) => (
  <Suspense fallback={<TableLoader />}>
    <div className={className}>{children}</div>
  </Suspense>
)

// PWA-specific lazy data loading hook
export const useLazyPWAData = <T,>(
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean
    cacheKey?: string
    offlineSupport?: boolean
  } = {}
) => {
  const { enabled = true, cacheKey, offlineSupport = true } = options
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!enabled || isOffline) return

    // Check cache first
    if (cacheKey) {
      const cached = window.electronAPI?.store.get(cacheKey)
      if (cached) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setData(JSON.parse(cached))
          return
        } catch {
          window.electronAPI?.store.delete(cacheKey)
        }
      }
    }

    setIsLoading(true)
    setIsError(false)

    fetcher()
      .then(result => {
        setData(result)

        // Cache for offline use
        if (cacheKey && offlineSupport) {
          window.electronAPI?.store.set(cacheKey, JSON.stringify(result))
        }
      })
      .catch(() => {
        setIsError(true)

        // Try to use cached data in error case
        if (cacheKey) {
          const cached = window.electronAPI?.store.get(cacheKey)
          if (cached) {
            try {
              setData(JSON.parse(cached))
              setIsError(false)
            } catch {
              window.electronAPI?.store.delete(cacheKey)
            }
          }
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [enabled, isOffline, cacheKey, offlineSupport, fetcher])

  return { data, isLoading, isError, isOffline }
}

// Intersection observer for viewport-based loading in PWA
export const usePWAIntersection = (
  callback: () => void,
  options: {
    threshold?: number
    rootMargin?: string
    triggerOnce?: boolean
  } = {}
) => {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    if (!ref) return undefined

    const observer = new IntersectionObserver(
      ([entry]: IntersectionObserverEntry[]) => {
        const isVisible = entry!.isIntersecting
        setIsIntersecting(isVisible)
        if (isVisible) {
          callback()
          if (options.triggerOnce) {
            observer.disconnect()
          }
        }
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? '0px',
      }
    )

    observer.observe(ref)

    return () => observer.disconnect()
  }, [ref, callback, options])

  return { ref: setRef, isIntersecting }
}

// Service worker update handler for lazy loaded components
export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true)
        }
      })
    }
  }, [])

  const applyUpdate = async () => {
    if ('serviceWorker' in navigator && updateAvailable) {
      setUpdating(true)

      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        }
      } catch (error) {
        console.error('Failed to apply update:', error)
        setUpdating(false)
      }
    }
  }

  return { updateAvailable, updating, applyUpdate }
}

// PWA-specific error boundary for lazy components
export const PWAErrorBoundary = ({ children, fallback }: {
  children: ReactNode
  fallback?: ReactNode
}) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('PWA Lazy Loading Error:', error)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      fallback ?? (
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-4">
            Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      )
    )
  }

  return <>{children}</>
}
