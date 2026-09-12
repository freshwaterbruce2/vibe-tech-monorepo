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
 * Runtime values are validated by the application configuration before Android
 * code uses them.
 */

(function configureEnv() {
  const PRODUCTION_API_URL = 'https://vibe-tutor-api-734857480460.us-east4.run.app';
  const LOCAL_API_URL = 'http://localhost:3001';

  const host = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

  if (!window.__API_URL__) {
    window.__API_URL__ = isLocalHost ? LOCAL_API_URL : PRODUCTION_API_URL;
  }

  window.__API_BASE_URL__ = '/api';
  window.__JAMENDO_CLIENT_ID__ = '12a7acff';
})();
