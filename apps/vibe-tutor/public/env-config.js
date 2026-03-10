/**
 * Environment Configuration
 *
 * This file sets window-based configuration variables to replace import.meta.env
 * which doesn't work in Android WebView builds.
 *
 * IMPORTANT: Update these values before building for production!
 */

// Set API configuration on window object
// Production: Cloud Run backend
window.__API_URL__ = 'https://vibe-tutor-api-960784183118.us-central1.run.app';
window.__API_BASE_URL__ = '/api';
window.__JAMENDO_CLIENT_ID__ = '12a7acff';

// For local development, override with:
// window.__API_URL__ = 'http://localhost:3001';

// eslint-disable-next-line no-console
console.log('[Env Config] Configuration loaded:', {
  apiUrl: window.__API_URL__,
  apiBaseUrl: window.__API_BASE_URL__,
  jamendoConfigured: window.__JAMENDO_CLIENT_ID__ !== 'YOUR_CLIENT_ID',
});
