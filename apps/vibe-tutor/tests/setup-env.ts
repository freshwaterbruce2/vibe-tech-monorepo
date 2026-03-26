process.env.NODE_ENV = 'test';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  if (typeof actual.act === 'function') {
    return actual;
  }

  const actShim = (callback: (() => unknown | Promise<unknown>) | undefined) => {
    const result = callback?.();

    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      return (result as PromiseLike<unknown>).then(() => undefined);
    }

    return undefined;
  };

  return {
    ...actual,
    act: actShim as typeof actual.act,
  };
});
