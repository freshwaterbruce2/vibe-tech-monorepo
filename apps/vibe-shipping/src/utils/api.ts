// API utility functions for consistent API calls

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * Helper function to construct full API URLs
 * @param path - API path (e.g., '/api/health')
 * @returns Full API URL
 */
export function getApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Wrapper for fetch that automatically adds the API base URL
 * @param path - API path
 * @param options - Fetch options
 * @returns Fetch promise
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(getApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}