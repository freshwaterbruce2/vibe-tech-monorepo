import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme.js';

// Provide a minimal matchMedia stub for jsdom
function mockMatchMedia(prefersDark: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches: prefersDark,
    addEventListener: vi.fn((_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn)),
    removeEventListener: vi.fn((_: string, fn: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    dispatchChange(matches: boolean) {
      listeners.forEach(fn => fn({ matches } as MediaQueryListEvent));
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => mql),
  });
  return mql;
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "system" as the initial theme when nothing is saved', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('restores the saved theme from localStorage', () => {
    localStorage.setItem('vibetech-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('ignores an invalid localStorage value', () => {
    localStorage.setItem('vibetech-theme', 'rainbow');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('setTheme updates theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('light'));

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('vibetech-theme')).toBe('light');
  });

  it('toggleTheme cycles light → dark → system → light', () => {
    localStorage.setItem('vibetech-theme', 'light');
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('system');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
  });

  it('applies the effective theme class to <html>', () => {
    localStorage.setItem('vibetech-theme', 'dark');
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies "light" class when theme is system and system prefers light', () => {
    mockMatchMedia(false);
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('detects the system theme preference', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.systemTheme).toBe('dark');
  });
});
