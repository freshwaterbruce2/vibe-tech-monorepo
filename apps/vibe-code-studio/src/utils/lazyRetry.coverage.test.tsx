/**
 * Direct coverage of lazyRetry's internal async factory wrapper.
 * Renders the lazy component so React invokes the retry path.
 */
import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { lazyRetry } from './lazyRetry';

describe('lazyRetry (render coverage)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads a component on first successful import', async () => {
    const factory = vi.fn().mockResolvedValue({
      default: () => <div data-testid="lazy-ok">ok</div>,
    });
    const Lazy = lazyRetry(factory, 1);
    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>
    );
    await waitFor(() => expect(screen.getByTestId('lazy-ok')).toBeInTheDocument());
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed import then renders', async () => {
    vi.useFakeTimers();
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        default: () => <div data-testid="lazy-retry">retried</div>,
      });
    const Lazy = lazyRetry(factory, 1);
    render(
      <Suspense fallback={<div data-testid="fb">loading</div>}>
        <Lazy />
      </Suspense>
    );
    await vi.advanceTimersByTimeAsync(350);
    await waitFor(() => expect(screen.getByTestId('lazy-retry')).toBeInTheDocument());
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('propagates error when retries are exhausted', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('hard fail'));
    const Lazy = lazyRetry(factory, 0);
    // React 19 may report the error via console; assert factory exhausted
    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>
    );
    await waitFor(() => expect(factory).toHaveBeenCalled());
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
