/**
 * React.lazy wrapper that retries a failed dynamic import once after a short delay.
 * Covers transient Vite HMR / dev-server blips that otherwise permanently break a chunk.
 */
import { lazy, type ComponentType } from 'react';

type DefaultModule<P = object> = { default: ComponentType<P> };

export function lazyRetry<P extends object = object>(
  factory: () => Promise<DefaultModule<P>>,
  retries = 1
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (retries <= 0) {
        throw err;
      }
      await new Promise<void>(resolve => {
        setTimeout(resolve, 300);
      });
      return factory();
    }
  });
}
