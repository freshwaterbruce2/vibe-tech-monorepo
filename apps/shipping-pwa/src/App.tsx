import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import TopNav from './components/layout/TopNav'
import { useWarehouseConfig } from './config/warehouse'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { TenantAuthProvider } from './contexts/TenantAuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { UserProvider } from './contexts/UserContext'
import Index from './pages/Index'

// Import enhanced lazy loading system
import {
  LazyAdminDashboard,
  LazyNotes,
  LazyPalletCounter,
  LazySettings,
  LazyWarehouseSetup,
  LazyWelcomeWizard,
  PWAErrorBoundary,
} from './components/lazy/LazyShippingComponents'

// Keep some critical components as regular lazy imports
const NotFound = lazy(async () => import('./pages/NotFound'))
const TenantAuthPage = lazy(async () => import('./pages/TenantAuthPage'))
const LandingPage = lazy(async () => import('./pages/LandingPage'))
const SignupPage = lazy(async () => import('./pages/SignupPage'))
const PrivacyPolicy = lazy(async () => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(async () => import('./pages/TermsOfService'))
const AdminLogin = lazy(async () =>
  import('./components/admin/AdminLogin').then(module => ({
    default: module.AdminLogin,
  }))
)

// New UI components pages
const Dashboard = lazy(async () => import('./pages/Dashboard'))
const Analytics = lazy(async () => import('./pages/Analytics'))
const Maps = lazy(async () => import('./pages/Maps'))
const Support = lazy(async () => import('./pages/Support'))

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

const queryClient = new QueryClient()

const AppContent = () => {
  const { config } = useWarehouseConfig()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    // Check if this is the first time the user is opening the app
    const hasCustomized = localStorage.getItem('warehouse-customized')
    const isDefaultConfig =
      config.companyName === 'Walmart Inc.' &&
      config.warehouseName === 'Distribution Center 8980'

    // Show welcome wizard if:
    // 1. Never customized before AND
    // 2. Still using default Walmart config
    if (!hasCustomized && isDefaultConfig) {
      // Delay state update slightly to avoid cascading render warnings
      timer = setTimeout(() => setShowWelcome(true), 0)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
     
  }, [config])

  const handleWelcomeComplete = () => {
    localStorage.setItem('warehouse-customized', 'true')
    setShowWelcome(false)
  }

  const handleWelcomeSkip = () => {
    localStorage.setItem('warehouse-customized', 'true')
    setShowWelcome(false)
  }

  // Check if user is authenticated (has tenant API key)
  const isAuthenticated =
    localStorage.getItem('tenantApiKey') ??
    localStorage.getItem('warehouse-customized')

  return (
    <>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes (no TopNav) */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<TenantAuthPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Root route - show landing if not authenticated */}
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <>
                      <ErrorBoundary>
                        <TopNav />
                      </ErrorBoundary>
                      <main className="container mx-auto p-4">
                        <ErrorBoundary>
                          <Index />
                        </ErrorBoundary>
                      </main>
                    </>
                  ) : (
                    <LandingPage />
                  )
                }
              />

              {/* Protected routes (with TopNav) */}
              <Route
                path="/pallet-counter"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <LazyPalletCounter />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/notes"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <LazyNotes />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/settings"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <LazySettings />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/admin/warehouse-setup"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <LazyWarehouseSetup />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <Dashboard />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/analytics"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <Analytics />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/maps"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <Maps />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route
                path="/support"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <Support />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <PWAErrorBoundary>
                        <LazyAdminDashboard />
                      </PWAErrorBoundary>
                    </main>
                  </>
                }
              />
              <Route path="/tenant/auth" element={<TenantAuthPage />} />
              <Route
                path="*"
                element={
                  <>
                    <ErrorBoundary>
                      <TopNav />
                    </ErrorBoundary>
                    <main className="container mx-auto p-4">
                      <ErrorBoundary>
                        <NotFound />
                      </ErrorBoundary>
                    </main>
                  </>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>

      {/* Welcome Wizard */}
      <PWAErrorBoundary>
        <Suspense fallback={null}>
          <LazyWelcomeWizard
            isOpen={showWelcome}
            onComplete={handleWelcomeComplete}
            onSkip={handleWelcomeSkip}
          />
        </Suspense>
      </PWAErrorBoundary>
    </>
  )
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <TenantAuthProvider>
          <AdminAuthProvider>
            <UserProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </UserProvider>
          </AdminAuthProvider>
        </TenantAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
)

export default App
