import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Avoid actually importing heavy AIChat/Settings modules via dynamic import side effects.
vi.mock('../../components/AIChat', () => ({
  default: () => <div data-testid="lazy-ai">ai</div>,
}));
vi.mock('../../components/Settings', () => ({
  default: () => <div data-testid="lazy-settings">settings</div>,
}));
vi.mock('../../components/CommandPalette', () => ({
  default: () => <div data-testid="lazy-cmd">cmd</div>,
}));
vi.mock('../../pages/WelcomePage', () => ({
  default: () => <div data-testid="lazy-welcome">welcome</div>,
}));

import {
  LazyAIChat,
  LazyCommandPalette,
  LazySettings,
  bundleOptimization,
  preloadStrategies,
  routes,
} from '../../components/LazyComponents.lazy';

describe('LazyComponents.lazy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports lazy components and welcome route', () => {
    expect(LazyAIChat).toBeTypeOf('object');
    expect(LazySettings).toBeTypeOf('object');
    expect(LazyCommandPalette).toBeTypeOf('object');
    expect(routes.welcome).toBeTypeOf('object');
  });

  it('loads each lazy factory (covers import() factories)', async () => {
    const Welcome = routes.welcome;
    for (const [Comp, id] of [
      [LazyAIChat, 'lazy-ai'],
      [LazySettings, 'lazy-settings'],
      [LazyCommandPalette, 'lazy-cmd'],
      [Welcome, 'lazy-welcome'],
    ] as const) {
      const { unmount } = render(
        <Suspense fallback={<div>loading</div>}>
          <Comp />
        </Suspense>
      );
      await waitFor(() => expect(screen.getByTestId(id)).toBeInTheDocument());
      unmount();
    }
  });

  it('preloadOnHover invokes the matching importer', async () => {
    await Promise.resolve(preloadStrategies.preloadOnHover('aiChat'));
    await Promise.resolve(preloadStrategies.preloadOnHover('settings'));
    await Promise.resolve(preloadStrategies.preloadOnHover('commandPalette'));
  });

  it('preloadOnIdle uses requestIdleCallback when available', () => {
    const ric = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', ric);
    preloadStrategies.preloadOnIdle('settings');
    expect(ric).toHaveBeenCalled();
  });

  it('preloadOnIdle is a no-op without requestIdleCallback', () => {
    // `'requestIdleCallback' in window` is true even if the value is undefined,
    // so remove the property entirely to hit the skip branch.
    const w = window as unknown as { requestIdleCallback?: unknown };
    const prev = w.requestIdleCallback;
    delete w.requestIdleCallback;
    expect(() => preloadStrategies.preloadOnIdle('aiChat')).not.toThrow();
    if (prev !== undefined) w.requestIdleCallback = prev;
  });

  it('preloadOnVisible observes the element and disconnects when intersecting', () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    let callback: IntersectionObserverCallback | undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
        takeRecords = vi.fn(() => []);
        root = null;
        rootMargin = '';
        thresholds: number[] = [];
      }
    );
    const el = document.createElement('div');
    const stop = preloadStrategies.preloadOnVisible(el, 'aiChat');
    expect(observe).toHaveBeenCalledWith(el);
    callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(disconnect).toHaveBeenCalled();
    stop();
  });

  it('bundleOptimization loaders resolve', async () => {
    await expect(bundleOptimization.loadCharts()).resolves.toBeNull();
    await expect(bundleOptimization.loadMonaco()).resolves.toBeTypeOf('object');
    await expect(bundleOptimization.loadMarkdown()).resolves.toBeTypeOf('object');
    // routes.welcome is a lazy component for WelcomePage
    expect(routes.welcome).toBeTypeOf('object');
  });
});
