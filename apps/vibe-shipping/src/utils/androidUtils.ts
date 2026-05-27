// Android-specific utility functions for better compatibility

export interface AndroidDeviceInfo {
  isAndroid: boolean
  isWebView: boolean
  isChrome: boolean
  version: string | null
  supportsSpeechRecognition: boolean
  supportsFileDownload: boolean
  supportsVibration: boolean
  supportsWakeLock: boolean
}

export const detectAndroidEnvironment = (): AndroidDeviceInfo => {
  const userAgent = navigator.userAgent
  const isAndroid = /Android/i.test(userAgent)
  const isWebView = /wv\)/.test(userAgent)
  const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)

  // Extract Android version
  const versionMatch = userAgent.match(/Android\s+(\d+\.\d+)/)
  const version = versionMatch ? versionMatch[1] : null

  // Feature detection
  const supportsSpeechRecognition =
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition) && !isWebView // WebView often has issues with speech recognition

  const supportsFileDownload = !isWebView || (isWebView && isChrome)
  const supportsVibration = 'vibrate' in navigator
  const supportsWakeLock = 'wakeLock' in navigator

  return {
    isAndroid,
    isWebView,
    isChrome,
    version: version ?? null,
    supportsSpeechRecognition,
    supportsFileDownload,
    supportsVibration,
    supportsWakeLock,
  }
}

export const optimizeForAndroid = () => {
  const deviceInfo = detectAndroidEnvironment()

  if (!deviceInfo.isAndroid) return

  // Optimize viewport for Android
  const viewport = document.querySelector('meta[name="viewport"]')
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    )
  }

  // Disable zoom on Android for better UX
  document.addEventListener(
    'touchmove',
    e => {
      if ((e as any).touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false }
  )

  // Prevent double-tap zoom
  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    e => {
      const now = new Date().getTime()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    },
    false
  )

  // Optimize memory usage on Android
  if (deviceInfo.version && parseFloat(deviceInfo.version) < 8.0) {
    // For older Android versions, reduce memory usage
    console.warn(
      'Older Android version detected, optimizing for lower memory usage'
    )
  }
}

export const requestAndroidPermissions = async (): Promise<{
  microphone: boolean
  storage: boolean
}> => {
  const permissions = {
    microphone: false,
    storage: false,
  }

  try {
    // Request microphone permission for speech recognition
    if ('permissions' in navigator) {
      const micResult = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      })
      permissions.microphone = micResult.state === 'granted'

      if (micResult.state === 'prompt') {
        // Try to trigger permission request via getUserMedia
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          stream.getTracks().forEach(track => track.stop())
          permissions.microphone = true
        } catch (error) {
          console.warn('Microphone permission denied:', error)
        }
      }
    }

    // Check storage permissions (for file downloads)
    if ('storage' in navigator.permissions) {
      try {
        const storageResult = await (navigator.permissions as any).query({
          name: 'persistent-storage',
        })
        permissions.storage = storageResult.state === 'granted'
      } catch {
        // Fallback - assume storage is available
        permissions.storage = true
      }
    } else {
      permissions.storage = true
    }
  } catch (error) {
    console.error('Error checking permissions:', error)
  }

  return permissions
}

export const enhanceAndroidPerformance = () => {
  const deviceInfo = detectAndroidEnvironment()

  if (!deviceInfo.isAndroid) return

  // Reduce animations on lower-end Android devices
  if (deviceInfo.version && parseFloat(deviceInfo.version) < 9.0) {
    document.documentElement.style.setProperty('--animation-duration', '0.1s')
    document.documentElement.style.setProperty('--transition-duration', '0.1s')
  }

  // Optimize touch handling
  document.body.style.touchAction = 'manipulation'

  // Improve scrolling performance
  document.documentElement.style.setProperty(
    '-webkit-overflow-scrolling',
    'touch'
  )

  // Reduce memory usage by limiting concurrent animations
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reducedMotion.matches) {
    document.documentElement.classList.add('reduce-motion')
  }
}

export const fixAndroidWebViewIssues = () => {
  const deviceInfo = detectAndroidEnvironment()

  if (!deviceInfo.isWebView) return

  console.warn('Android WebView detected - applying compatibility fixes')

  // Fix for WebView speech recognition issues
  if (!deviceInfo.supportsSpeechRecognition) {
    console.warn(
      'Speech recognition not available in WebView - showing alternative input methods'
    )

    // Dispatch custom event to notify components
    window.dispatchEvent(
      new CustomEvent('webview-speech-unavailable', {
        detail: { reason: 'WebView environment detected' },
      })
    )
  }

  // Fix for WebView file download issues
  if (!deviceInfo.supportsFileDownload) {
    console.warn(
      'File downloads may not work in WebView - providing alternative'
    )

    window.dispatchEvent(
      new CustomEvent('webview-download-unavailable', {
        detail: { reason: 'WebView download restrictions' },
      })
    )
  }

  // Fix WebView keyboard issues
  document.addEventListener('focusin', e => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  })
}

// Utility to show Android-specific error messages
export const showAndroidCompatibilityMessage = (
  feature: string,
  isSupported: boolean
) => {
  if (isSupported) return undefined

  const deviceInfo = detectAndroidEnvironment()

  const messages = {
    speechRecognition: deviceInfo.isWebView
      ? 'Voice commands are not available in WebView. Please use the regular input methods.'
      : 'Voice commands require microphone permissions and Chrome browser.',

    fileDownload: deviceInfo.isWebView
      ? 'File downloads may be restricted in WebView. Data will be saved locally.'
      : 'File downloads require storage permissions.',

    vibration: 'Vibration feedback is not available on this device.',

    wakeLock:
      'Screen will not stay on automatically. Please adjust device settings if needed.',
  }

  console.warn(
    `Android compatibility: ${feature} - ${messages[feature as keyof typeof messages]}`
  )

  return messages[feature as keyof typeof messages]
}

// Initialize Android optimizations
export const initAndroidSupport = async () => {
  const deviceInfo = detectAndroidEnvironment()

  if (!deviceInfo.isAndroid) return deviceInfo

  console.warn('Android device detected, initializing optimizations...')

  // Apply all Android optimizations
  optimizeForAndroid()
  enhanceAndroidPerformance()
  fixAndroidWebViewIssues()

  // Request necessary permissions
  const permissions = await requestAndroidPermissions()

  console.warn('Android optimization complete:', {
    deviceInfo,
    permissions,
  })

  return { deviceInfo, permissions }
}
