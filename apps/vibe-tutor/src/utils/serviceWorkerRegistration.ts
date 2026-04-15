import { logger } from './logger';

interface CapacitorRuntime {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
  addEventListener?: (type: 'load', listener: () => void, options?: { once?: boolean }) => void;
  location?: {
    protocol?: string;
  };
  navigator?: {
    serviceWorker?: {
      register: (scriptUrl: string) => Promise<unknown>;
    };
  };
}

/**
 * Returns true when the current runtime is a native Capacitor app, including
 * Android builds that are served from https://localhost inside the WebView.
 */
export function shouldRegisterServiceWorker(runtime: CapacitorRuntime = globalThis): boolean {
  const protocol = runtime.location?.protocol;
  if (protocol === 'capacitor:' || protocol === 'ionic:') {
    return false;
  }

  return runtime.Capacitor?.isNativePlatform?.() !== true;
}

/**
 * Registers the PWA service worker only for browser runtimes.
 */
export function registerServiceWorker(runtime: CapacitorRuntime = globalThis): void {
  if (!runtime.navigator?.serviceWorker) {
    return;
  }

  if (!shouldRegisterServiceWorker(runtime)) {
    logger.info('[Capacitor] Service worker disabled for native app - no caching');
    return;
  }

  const register = () => {
    runtime.navigator?.serviceWorker
      ?.register('/service-worker.js?v=6')
      .then(
        () => {
          logger.info('[PWA] Service Worker registered successfully');
        },
        (error) => {
          logger.info('[PWA] ServiceWorker registration failed: ', error);
        },
      );
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }

  runtime.addEventListener?.('load', register, { once: true });
}
