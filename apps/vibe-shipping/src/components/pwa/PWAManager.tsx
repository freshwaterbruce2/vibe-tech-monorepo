/**
 * Advanced PWA Manager Component
 * Handles installation, notifications, background sync, and offline functionality
 */

import { Bell, Download, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { toast } from '../ui/use-toast'

interface PWAManagerProps {
  className?: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface ServiceWorkerMessage {
  type: string
  payload?: any
}

 
export function PWAManager({ className }: PWAManagerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')
  const [isUpdating, setIsUpdating] = useState(false)
  const [cacheSize, setCacheSize] = useState<number>(0)
  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<
    'idle' | 'syncing' | 'complete'
  >('idle')
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)

  // Background sync trigger
  const triggerBackgroundSync = useCallback(async () => {
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('background-sync')
      } catch (error) {
        console.error('Background sync registration failed:', error)
      }
    }
  }, [])

  // Service worker message handler
  const handleServiceWorkerMessage = useCallback(
    (event: MessageEvent<ServiceWorkerMessage>) => {
      const { type, payload } = event.data

      switch (type) {
        case 'BACKGROUND_SYNC_START':
          setBackgroundSyncStatus('syncing')
          break

        case 'BACKGROUND_SYNC_COMPLETE':
          setBackgroundSyncStatus('complete')
          toast({
            title: 'Sync Complete',
            description: `Successfully synced ${payload?.count ?? 'all'} items`,
            duration: 2000,
          })
          setTimeout(() => setBackgroundSyncStatus('idle'), 3000)
          break

        case 'CACHE_UPDATED':
          toast({
            title: 'Content Updated',
            description: 'Latest content is now available',
            duration: 2000,
          })
          break

        case 'FORCE_REFRESH':
          window.location.reload()
          break

        default:
          break
      }
    },
    []
  )

  // App update handler
  const updateApp = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [])

  // Check if PWA is already installed
  useEffect(() => {
    const checkPWAInstalled = () => {
      const isInstalled =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as any).standalone === true
      setIsPWAInstalled(isInstalled)
    }

    checkPWAInstalled()
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', checkPWAInstalled)

    return () => {
      window
        .matchMedia('(display-mode: standalone)')
        .removeEventListener('change', checkPWAInstalled)
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: 'Connection Restored',
        description: 'Syncing offline changes...',
        duration: 3000,
      })
      triggerBackgroundSync()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: 'Working Offline',
        description: 'Changes will sync when connection is restored',
        variant: 'destructive',
        duration: 3000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [triggerBackgroundSync])

  // Service Worker Management
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    {
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener(
        'message',
        handleServiceWorkerMessage
      )

      // Check for service worker updates
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            setIsUpdating(true)
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New service worker installed and ready
                toast({
                  title: 'App Update Available',
                  description: 'Restart the app to get the latest features',
                  action: (
                    <Button onClick={updateApp} size="sm">
                      Update Now
                    </Button>
                  ),
                })
                setIsUpdating(false)
              }
            })
          }
        })
      })

      return () => {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleServiceWorkerMessage
        )
      }
    }
  }, [handleServiceWorkerMessage, updateApp])

  // PWA Installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
    }
  }, [])

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Monitor cache size and performance
  useEffect(() => {
    const monitorPerformance = async () => {
      try {
        // Cache size estimation
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate()
          setCacheSize(estimate.usage ?? 0)
        }

        // Performance metrics
        if ('getEntriesByType' in performance) {
          const navigation = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming
          if (navigation) {
            const navigationStart =
              navigation.startTime || performance.timing?.navigationStart || 0
            setPerformanceMetrics({
              loadTime: Math.round(navigation.loadEventEnd - navigationStart),
              domContentLoaded: Math.round(
                navigation.domContentLoadedEventEnd - navigationStart
              ),
              firstPaint:
                performance.getEntriesByName('first-paint')[0]?.startTime || 0,
              firstContentfulPaint:
                performance.getEntriesByName('first-contentful-paint')[0]
                  ?.startTime || 0,
            })
          }
        }
      } catch (error) {
        console.warn('Performance monitoring failed:', error)
      }
    }

    monitorPerformance()
    const interval = setInterval(monitorPerformance, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const installPWA = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setIsPWAInstalled(true)
        toast({
          title: 'App Installed!',
          description: 'DC8980 Shipping is now installed on your device',
          duration: 3000,
        })
      }

      setInstallPrompt(null)
    } catch (error) {
      console.error('PWA installation failed:', error)
      toast({
        title: 'Installation Failed',
        description: 'Unable to install the app. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications Not Supported',
        description: 'Your browser does not support notifications',
        variant: 'destructive',
      })
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description:
            'You will receive updates about door schedules and sync status',
          duration: 3000,
        })

        // Subscribe to push notifications
        await subscribeToPushNotifications()
      } else {
        toast({
          title: 'Notifications Disabled',
          description: 'You can enable notifications in your browser settings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Notification permission request failed:', error)
    }
  }

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
      })

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
    } catch (error) {
      console.error('Push notification subscription failed:', error)
    }
  }

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(async name => caches.delete(name)))
        setCacheSize(0)
        toast({
          title: 'Cache Cleared',
          description: 'All cached data has been removed',
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('Cache clearing failed:', error)
      toast({
        title: 'Cache Clear Failed',
        description: 'Unable to clear cache. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            PWA Features
          </CardTitle>
          <CardDescription>
            Manage Progressive Web App features and performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {backgroundSyncStatus !== 'idle' && (
              <Badge
                variant={
                  backgroundSyncStatus === 'syncing' ? 'default' : 'secondary'
                }
              >
                {backgroundSyncStatus === 'syncing' ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : null}
                {backgroundSyncStatus === 'syncing' ? 'Syncing...' : 'Synced'}
              </Badge>
            )}
          </div>

          {/* Installation */}
          {!isPWAInstalled && installPrompt && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Install App
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Add to your home screen for better experience
                </p>
              </div>
              <Button onClick={installPWA} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>
            </div>
          )}

          {isPWAInstalled && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <Download className="w-4 h-4 text-green-600" />
              <span className="text-green-900 dark:text-green-100 font-medium">
                App Installed
              </span>
            </div>
          )}

          {/* Notifications */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="font-medium">Notifications</span>
              <Badge
                variant={
                  notificationPermission === 'granted' ? 'default' : 'secondary'
                }
              >
                {notificationPermission}
              </Badge>
            </div>
            {notificationPermission !== 'granted' && (
              <Button
                onClick={requestNotificationPermission}
                variant="outline"
                size="sm"
              >
                Enable
              </Button>
            )}
          </div>

          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="space-y-2">
              <h4 className="font-medium">Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">Load Time</div>
                  <div className="text-muted-foreground">
                    {performanceMetrics.loadTime}ms
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">First Paint</div>
                  <div className="text-muted-foreground">
                    {Math.round(performanceMetrics.firstPaint)}ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cache Management */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="font-medium">Cache Size</div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(cacheSize)}
              </div>
            </div>
            <Button onClick={clearCache} variant="outline" size="sm">
              Clear Cache
            </Button>
          </div>

          {/* Manual Sync */}
          <Button
            onClick={triggerBackgroundSync}
            variant="outline"
            className="w-full"
            disabled={!isOnline || backgroundSyncStatus === 'syncing'}
          >
            {backgroundSyncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {backgroundSyncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>

          {isUpdating && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-yellow-600" />
                <span className="font-medium text-yellow-900 dark:text-yellow-100">
                  Updating App...
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PWAManager
