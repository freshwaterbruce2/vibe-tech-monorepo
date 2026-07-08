// Service Worker Registration

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.warn('SW registered: ', registration)

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.warn('New content is available; please refresh.')
                // Show update notification to user
                dispatchEvent(new CustomEvent('sw-update-available'))
              }
            }
          })
        }
      })
    } catch (error) {
      console.error('SW registration failed: ', error)
    }
  })
}

export {}
