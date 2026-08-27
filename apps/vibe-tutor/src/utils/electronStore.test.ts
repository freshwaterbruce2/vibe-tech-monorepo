import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore, onStorageQuotaExceeded } from './electronStore';

describe('appStore — QuotaExceededError handling (SVC-09 / 2C)', () => {
  let originalSet: (key: string, value: unknown) => void;

  beforeEach(() => {
    originalSet = window.electronAPI.store.set;
  });

  afterEach(() => {
    window.electronAPI.store.set = originalSet;
    onStorageQuotaExceeded(null);
  });

  it('invokes the registered handler when storage is full', () => {
    const quotaError = new DOMException('exceeded', 'QuotaExceededError');
    window.electronAPI.store.set = vi.fn(() => {
      throw quotaError;
    });
    const handler = vi.fn();
    onStorageQuotaExceeded(handler);

    // Should not throw — the write fails gracefully and notifies the handler.
    expect(() => appStore.set('big-key', 'x'.repeat(32))).not.toThrow();
    expect(handler).toHaveBeenCalledWith('big-key');
  });

  it('does not invoke the handler for non-quota errors', () => {
    window.electronAPI.store.set = vi.fn(() => {
      throw new Error('some other failure');
    });
    const handler = vi.fn();
    onStorageQuotaExceeded(handler);

    expect(() => appStore.set('key', 'value')).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
