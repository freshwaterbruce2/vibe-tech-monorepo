import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../CircuitBreaker';

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker();
    expect(cb.getStatus().state).toBe('CLOSED');
    expect(cb.getStatus().failures).toBe(0);
  });

  it('executes operations successfully in CLOSED state', async () => {
    const cb = new CircuitBreaker();
    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.getStatus().state).toBe('CLOSED');
  });

  it('counts failures but stays CLOSED below threshold', async () => {
    const cb = new CircuitBreaker(3); // threshold = 3
    for (let i = 0; i < 2; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    }
    expect(cb.getStatus().failures).toBe(2);
    expect(cb.getStatus().state).toBe('CLOSED');
  });

  it('opens circuit after reaching failure threshold', async () => {
    const cb = new CircuitBreaker(3);
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    }
    expect(cb.getStatus().state).toBe('OPEN');
  });

  it('rejects immediately when OPEN and retry timeout not elapsed', async () => {
    const cb = new CircuitBreaker(1, 60000, 10000);
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getStatus().state).toBe('OPEN');

    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow(
      'Circuit breaker is OPEN'
    );
  });

  it('transitions to HALF_OPEN after retry timeout', async () => {
    const cb = new CircuitBreaker(1, 60000, 100);
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getStatus().state).toBe('OPEN');

    // Wait for retry timeout
    await new Promise((r) => setTimeout(r, 150));

    const result = await cb.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(cb.getStatus().state).toBe('CLOSED');
    expect(cb.getStatus().failures).toBe(0);
  });

  it('resets failures on successful execution', async () => {
    const cb = new CircuitBreaker(5);
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getStatus().failures).toBe(1);

    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getStatus().failures).toBe(0);
  });

  it('times out long-running operations', async () => {
    const cb = new CircuitBreaker(5, 50); // 50ms timeout
    const slowOp = () => new Promise<string>((resolve) => setTimeout(() => resolve('slow'), 200));

    await expect(cb.execute(slowOp)).rejects.toThrow('Request timeout');
  });
});
