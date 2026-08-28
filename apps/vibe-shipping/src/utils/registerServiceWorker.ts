export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        // iOS Safari specific handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        const registration =
          await navigator.serviceWorker.register("/serviceWorker.js", {
            scope: "/",
            updateViaCache: "none" // Important for iOS
          });

        // iOS specific handling for updates
        if (isIOS && isStandalone) {
          // PWA running on iOS - no special handling needed
        }

        // Check for updates to the Service Worker
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // At this point, a new service worker has been installed and the old one is controlling the page
              }
            });
          }
        });
      } catch (error) {
        console.error("ServiceWorker registration failed:", error);
      }
    });

    // Handle controlled page refreshing for new service worker activation
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Function to manually check for service worker updates
export function checkForUpdates() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.update();
      })
      .catch((error) => {
        console.error("Error checking for service worker updates:", error);
      });
  }
}

// Create a hook to expose the checkForUpdates functionality in React components
