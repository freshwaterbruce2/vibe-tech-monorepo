import { describe, expect, it } from 'vitest';
import { Semaphore } from '../rate-limit.js';

describe('Semaphore', () => {
  it('allows up to maxConcurrency operations at once', async () => {
    const semaphore = new Semaphore(2);
    const release1 = await semaphore.acquire();
    const release2 = await semaphore.acquire();
    expect(semaphore.running).toBe(2);

    release1();
    const release3 = await semaphore.acquire();
    expect(semaphore.running).toBe(2);

    release2();
    release3();
    expect(semaphore.running).toBe(0);
  });

  it('blocks additional operations until one releases', async () => {
    const semaphore = new Semaphore(1);
    const order: number[] = [];

    const release1 = await semaphore.acquire();

    const promise2 = semaphore.acquire().then((release) => {
      order.push(2);
      release();
    });

    order.push(1);
    release1();

    await promise2;
    expect(order).toEqual([1, 2]);
  });

  it('rejects non-positive concurrency', () => {
    expect(() => new Semaphore(0)).toThrow('maxConcurrency must be positive');
  });
});
