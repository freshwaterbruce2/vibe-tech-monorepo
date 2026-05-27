import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import InstallPrompt from './InstallPrompt'
// cspell:ignore sonner
import { useUserSettings } from '@/hooks/useUserSettings'
import { toast } from 'sonner'

interface PwaWrapperProps {
  children: ReactNode
}

interface SyncManager {
  register(tag: string): Promise<void>
}

// Add interface for extending ServiceWorkerRegistration
type ExtendedServiceWorkerRegistration = Omit<
  ServiceWorkerRegistration,
  'sync'
> & {
  sync?: SyncManager
}

const PwaWrapper = ({ children }: PwaWrapperProps) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [wasOffline, setWasOffline] = useState<boolean>(false)
  const { settings: _settings } = useUserSettings() // Import user settings to ensure they're available app-wide

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        toast.success("You're back online!", {
          description: 'Your changes will now be synchronized',
          icon: <Wifi className="h-4 w-4" />,
        })
        // Trigger background sync if the service worker supports it
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            // Use the Background Sync API only if available
            if ('SyncManager' in window) {
              // Use the extended type for the registration
              const extendedRegistration =
                registration as ExtendedServiceWorkerRegistration

              try {
                // Safely check if sync exists before using it
                if (extendedRegistration.sync) {
                  extendedRegistration.sync
                    .register('sync-shipping-data')
                    .catch(err =>
                      console.error('Background sync registration failed:', err)
                    )
                } else {
                  // sync not available, skip silently
                }
              } catch (error) {
                console.error('Sync registration error:', error)
              }
            } else {
              // Fallback for browsers that don't support Background Sync API
              // Implement alternative sync strategy here if needed
            }
          })
        }
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      toast.warning("You're offline", {
        description:
          "The app will continue to work. Changes will sync when you're back online",
        duration: 5000,
        icon: <WifiOff className="h-4 w-4" />,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return (
    <>
      {children}
      <InstallPrompt />
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-black px-4 py-1 text-sm text-center font-medium z-50">
          Offline Mode — Changes will sync when connection is restored
        </div>
      )}
    </>
  )
}

export default PwaWrapper
