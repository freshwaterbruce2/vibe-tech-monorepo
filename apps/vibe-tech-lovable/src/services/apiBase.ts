export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    const normalized = configured.replace(/\/+$/, '');

    // Guard against leaking root/dev localhost env vars into production bundles.
    if (import.meta.env.PROD && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(normalized)) {
      return '';
    }

    return normalized;
  }

  // Production defaults to same-origin to avoid shipping localhost URLs.
  return import.meta.env.PROD ? '' : 'http://localhost:9001';
};
