/**
 * Shared API fetch utility.
 * Provides consistent error handling, JSON parsing, and credential handling
 * for all service layer API calls.
 */

export interface ApiFetchOptions extends RequestInit {
  /** Skip automatic JSON parsing (for blob responses, etc.) */
  raw?: boolean
}

export const apiFetch = async <T = Record<string, unknown>>(
  path: string,
  init?: ApiFetchOptions
): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const message =
      (typeof body?.error === 'string' ? body.error : undefined) ??
      (typeof body?.message === 'string' ? body.message : undefined) ??
      res.statusText
    throw new Error(message)
  }

  if (init?.raw) {
    return res as unknown as T
  }

  return (await res.json().catch(() => ({}))) as T
}
