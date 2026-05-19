export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    const normalized = configured.replace(/\/+$/, '');
    const isLocalApi = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(
      normalized,
    );
    const isBrowserLocalhost =
      typeof window !== 'undefined' &&
      /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

    // Guard against leaking root/dev localhost env vars into deployed browser bundles.
    if (isLocalApi && !isBrowserLocalhost) {
      return '';
    }

    return normalized;
  }

  // Production defaults to same-origin to avoid shipping localhost URLs.
  return import.meta.env.PROD ? '' : 'http://localhost:9001';
};
