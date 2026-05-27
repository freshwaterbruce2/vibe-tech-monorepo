const API_BASE =
  import.meta.env.VITE_BOOKING_API_URL ??
  (import.meta.env.PROD ? import.meta.env.VITE_API_URL : '/api') ??
  '/api';
const TOKEN_KEY = 'booking_next_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringifyErrorValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return null;

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

async function readApiError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.clone().json()) as unknown;
      if (isRecord(payload)) {
        const error = stringifyErrorValue(payload['error']);
        if (error) return error;

        const message = stringifyErrorValue(payload['message']);
        if (message) return message;
      }
    } catch {
      // Fall back to the raw body below.
    }
  }

  return (await response.text()) || `Request failed: ${response.status}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return (await response.json()) as T;
}
