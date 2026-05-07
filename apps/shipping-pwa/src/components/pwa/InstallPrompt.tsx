import { useWarehouseConfig } from '@/config/warehouse'
import { useMobile } from '@/hooks/useMobile'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { Button } from '@vibetech/ui'
import { Download, Plus, Share, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const InstallPrompt = () => {
  const { isInstallable, promptToInstall, isIOS } = usePwaInstall()
  const [dismissed, setDismissed] = useState<boolean>(false)
  const { isMobile } = useMobile()
  const [showAfterDelay, setShowAfterDelay] = useState<boolean>(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false)
  const { config } = useWarehouseConfig()

  useEffect(() => {
    // Show the install prompt after 3 seconds of user interaction
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowAfterDelay(true)
      }, 3000)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [isInstallable])

  const handleInstall = () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      toast.info('Follow the instructions to install', {
        description: "Tap the share button and select 'Add to Home Screen'",
      })
    } else {
      promptToInstall()
      toast.success('Installing app to your device', {
        description: "You'll be able to access this app from your home screen",
      })
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Remember dismissal for 24 hours
    localStorage.setItem(
      'installPromptDismissed',
      new Date().toISOString()
    )
  }

  // Check if the prompt was dismissed in the last 24 hours
  useEffect(() => {
    const dismissedTime = localStorage.getItem(
      'installPromptDismissed'
    )
    if (dismissedTime) {
      const dismissedDate = new Date(dismissedTime)
      const now = new Date()
      const hoursPassed =
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60)
      if (hoursPassed < 24) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(true)
      } else {
        localStorage.removeItem('installPromptDismissed')
      }
    }
  }, [])

  if (!isInstallable || dismissed || !showAfterDelay) return null

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
          <h3 className="font-semibold text-lg mb-4">Install on iPhone</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">
                1
              </span>
              <span>
                Tap the <Share className="inline h-4 w-4 mx-1" /> Share button
                at the bottom of Safari
              </span>
            </div>
            <div className="flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">
                2
              </span>
              <span>
                Scroll down and tap <Plus className="inline h-4 w-4 mx-1" />{' '}
                "Add to Home Screen"
              </span>
            </div>
            <div className="flex items-center">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">
                3
              </span>
              <span>Tap "Add" to install the app</span>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowIOSInstructions(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowIOSInstructions(false)
                handleDismiss()
              }}
              className="flex-1"
              style={{ backgroundColor: config.brandColors.primary }}
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-fade-in z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            className="mr-3 rounded-full p-2"
            style={{ backgroundColor: config.brandColors.primary }}
          >
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              Install {config.appShortName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isIOS
                ? 'Add to home screen for the best experience'
                : isMobile
                  ? 'Add to home screen for quick access'
                  : 'Install for offline access and better performance'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="text-gray-500"
          >
            Later
          </Button>
          <Button
            onClick={handleInstall}
            style={{ backgroundColor: config.brandColors.primary }}
          >
            {isIOS ? (
              <Share className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isIOS ? 'Instructions' : 'Install'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default InstallPrompt
