/**
 * Environment Configuration
 *
 * Sets window-based configuration variables to replace import.meta.env
 * (which doesn't work in Android WebView builds).
 *
 * Behavior:
 *   - When loaded on localhost / 127.0.0.1 → uses http://localhost:3001
 *   - Otherwise (production bundle, Capacitor build) → uses Cloud Run URL
 *
 * Override at runtime by assigning window.__API_URL__ before this script runs,
 * or set VITE_API_ENDPOINT at build time.
 */

(function configureEnv() {
  var PRODUCTION_API_URL = 'https://vibe-tutor-api-960784183118.us-central1.run.app';
  // render-backend dev server runs on 3002 to avoid conflict with the shared
  // openrouter-proxy on 3001 (used by vibe-code-studio, nova-agent, etc.).
  var LOCAL_API_URL = 'http://localhost:3002';

  var host = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
  var isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

  if (!window.__API_URL__) {
    window.__API_URL__ = isLocalHost ? LOCAL_API_URL : PRODUCTION_API_URL;
  }

  window.__API_BASE_URL__ = '/api';
  window.__JAMENDO_CLIENT_ID__ = '12a7acff';

  // eslint-disable-next-line no-console
  console.log('[Env Config] Configuration loaded:', {
    apiUrl: window.__API_URL__,
    apiBaseUrl: window.__API_BASE_URL__,
    jamendoConfigured: window.__JAMENDO_CLIENT_ID__ !== 'YOUR_CLIENT_ID',
    isLocalHost: isLocalHost,
  });
})();
