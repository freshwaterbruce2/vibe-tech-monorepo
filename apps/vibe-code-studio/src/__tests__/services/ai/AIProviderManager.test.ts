import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AIProviderManager } from '../../../services/ai/AIProviderManager';
import { AIProvider, MODEL_REGISTRY } from '../../../services/ai/AIProviderInterface';
import type { AIProviderConfig } from '../../../services/ai/AIProviderInterface';

vi.mock('../../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services/ai/providers/LocalProvider', () => ({
  LocalProvider: class MockLocalProvider {
    initialize = vi.fn(async () => undefined);
    complete = vi.fn(async () => ({ content: 'local-response' }));
    streamComplete = vi.fn();
  },
}));

const REQ_ID_RE = /^req_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type SentMessage = { channel: string; data: { type?: string; requestId?: string } & object };

// Captured once: the fromMain listener is installed a single time (static flag).
let fromMainHandler: ((msg: unknown) => void) | null = null;
const sentMessages: SentMessage[] = [];

function installIpc(): void {
  const ipc = {
    send: vi.fn((channel: string, data?: unknown) => {
      sentMessages.push({ channel, data: (data ?? {}) as SentMessage['data'] });
    }),
    on: vi.fn((channel: string, fn: (msg: unknown) => void) => {
      if (channel === 'fromMain') {
        fromMainHandler = fn;
      }
      return () => undefined;
    }),
  };
  const win = window as unknown as { electron?: object };
  win.electron = { ...(win.electron ?? {}), ipc };
}

function lastSent(type: string): SentMessage | undefined {
  return [...sentMessages].reverse().find(m => m.data.type === type);
}

function config(provider: AIProvider): AIProviderConfig {
  return { provider, apiKey: 'test-key', model: 'test-model' };
}

describe('AIProviderManager', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    installIpc();
  });

  it('constructs without throwing and installs the fromMain listener', () => {
    const manager = new AIProviderManager();

    expect(manager).toBeInstanceOf(AIProviderManager);
    expect(typeof fromMainHandler).toBe('function');
  });

  it('tracks provider configuration and current-provider selection', async () => {
    const manager = new AIProviderManager();

    expect(manager.getCurrentProvider()).toBeNull();
    expect(manager.isProviderConfigured(AIProvider.MOONSHOT)).toBe(false);

    await manager.setProvider(AIProvider.MOONSHOT, config(AIProvider.MOONSHOT));

    expect(manager.isProviderConfigured(AIProvider.MOONSHOT)).toBe(true);
    expect(manager.getCurrentProvider()).toBe(AIProvider.MOONSHOT);
    expect(manager.getConfiguredProviders()).toContain(AIProvider.MOONSHOT);

    expect(() => manager.setCurrentProvider(AIProvider.GOOGLE)).toThrow(
      /Provider google is not configured/
    );

    await manager.setProvider(AIProvider.OPENROUTER, config(AIProvider.OPENROUTER));
    manager.setCurrentProvider(AIProvider.OPENROUTER);
    expect(manager.getCurrentProvider()).toBe(AIProvider.OPENROUTER);
  });

  it('initializes a direct provider instance for the LOCAL provider', async () => {
    const manager = new AIProviderManager();

    await manager.setProvider(AIProvider.LOCAL, config(AIProvider.LOCAL));

    expect(manager.isProviderConfigured(AIProvider.LOCAL)).toBe(true);
  });

  it('exposes the model registry through helper methods', () => {
    const manager = new AIProviderManager();

    const models = manager.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models).toEqual(Object.values(MODEL_REGISTRY));

    expect(manager.getModelInfo('moonshot/kimi-2.5-pro')?.provider).toBe(AIProvider.MOONSHOT);
    expect(manager.getModelInfo('no/such-model')).toBeUndefined();
  });

  it('complete() rejects unknown models and unconfigured providers', async () => {
    const manager = new AIProviderManager();

    await expect(
      manager.complete('no/such-model', { messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(/Unknown model/);

    await expect(
      manager.complete('deepseek/deepseek-v3.2', { messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(/Provider openrouter not configured/);
  });

  it('complete() on a configured remote provider directs callers to completeViaMain', async () => {
    const manager = new AIProviderManager();
    await manager.setProvider(AIProvider.MOONSHOT, config(AIProvider.MOONSHOT));

    await expect(
      manager.complete('moonshot/kimi-2.5-pro', { messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(/completion not implemented via direct call\. Use completeViaMain/);
  });

  it('streamComplete() rejects unknown models and unconfigured providers', async () => {
    const manager = new AIProviderManager();

    await expect(
      manager.streamComplete('no/such-model', { messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(/Unknown model/);

    await expect(
      manager.streamComplete('deepseek/deepseek-v3.2', {
        messages: [{ role: 'user', content: 'hi' }],
      })
    ).rejects.toThrow(/Provider openrouter not configured/);
  });

  it('streamComplete() on a configured remote provider directs callers to streamViaMain', async () => {
    const manager = new AIProviderManager();
    await manager.setProvider(AIProvider.MOONSHOT, config(AIProvider.MOONSHOT));

    await expect(
      manager.streamComplete('moonshot/kimi-2.5-pro', {
        messages: [{ role: 'user', content: 'hi' }],
      })
    ).rejects.toThrow(/streaming not implemented via direct call\. Use streamViaMain/);
  });

  it('completeViaMain resolves with the main-process result (crypto request id)', async () => {
    const manager = new AIProviderManager();

    const promise = manager.completeViaMain({
      messages: [{ role: 'user', content: 'hello' }],
    });

    const sent = lastSent('ai:complete');
    expect(sent).toBeDefined();
    expect(sent!.channel).toBe('toMain');
    expect(sent!.data.requestId).toMatch(REQ_ID_RE);

    fromMainHandler!({
      type: 'ai:complete:result',
      requestId: sent!.data.requestId,
      success: true,
      provider: 'deepseek',
      model: 'deepseek-chat',
      content: 'main says hi',
    });

    await expect(promise).resolves.toEqual({
      provider: 'deepseek',
      model: 'deepseek-chat',
      content: 'main says hi',
    });
  });

  it('completeViaMain rejects when the main process reports failure', async () => {
    const manager = new AIProviderManager();

    const promise = manager.completeViaMain({
      messages: [{ role: 'user', content: 'hello' }],
    });
    const sent = lastSent('ai:complete');

    fromMainHandler!({
      type: 'ai:complete:result',
      requestId: sent!.data.requestId,
      success: false,
      error: 'provider exploded',
    });

    await expect(promise).rejects.toThrow('provider exploded');
  });

  it('completeViaMain aborts via the provided signal and notifies main', async () => {
    const manager = new AIProviderManager();
    const controller = new AbortController();

    const promise = manager.completeViaMain(
      { messages: [{ role: 'user', content: 'hello' }] },
      controller.signal
    );
    controller.abort();

    await expect(promise).rejects.toThrow(/Aborted/);
    expect(lastSent('ai:abort')).toBeDefined();
  });

  it('completeViaMain rejects immediately when the signal is already aborted', async () => {
    const manager = new AIProviderManager();
    const controller = new AbortController();
    controller.abort();

    await expect(
      manager.completeViaMain({ messages: [{ role: 'user', content: 'hello' }] }, controller.signal)
    ).rejects.toThrow(/Aborted/);
  });

  it('streamViaMain yields chunks pushed from the main process until done', async () => {
    const manager = new AIProviderManager();
    const received: string[] = [];

    const collector = (async () => {
      for await (const chunk of manager.streamViaMain({
        messages: [{ role: 'user', content: 'stream please' }],
      })) {
        received.push(chunk);
      }
    })();

    const sent = lastSent('ai:stream:start');
    expect(sent).toBeDefined();
    expect(sent!.data.requestId).toMatch(REQ_ID_RE);

    const requestId = sent!.data.requestId;
    fromMainHandler!({ type: 'ai:stream:chunk', requestId, chunk: 'Hello', provider: 'deepseek' });
    fromMainHandler!({ type: 'ai:stream:chunk', requestId, chunk: ' world', provider: 'deepseek' });
    fromMainHandler!({
      type: 'ai:stream:done',
      requestId,
      success: true,
      provider: 'deepseek',
      model: 'deepseek-chat',
    });

    await collector;
    expect(received).toEqual(['Hello', ' world']);
  });

  it('streamViaMain surfaces a stream failure from the main process', async () => {
    const manager = new AIProviderManager();

    const collector = (async () => {
      const chunks: string[] = [];
      for await (const chunk of manager.streamViaMain({
        messages: [{ role: 'user', content: 'stream please' }],
      })) {
        chunks.push(chunk);
      }
      return chunks;
    })();

    const sent = lastSent('ai:stream:start');
    fromMainHandler!({
      type: 'ai:stream:done',
      requestId: sent!.data.requestId,
      success: false,
      error: 'stream blew up',
    });

    await expect(collector).rejects.toThrow('stream blew up');
  });

  it('completeViaMain and streamViaMain require the Electron IPC bridge', async () => {
    const win = window as unknown as { electron?: { ipc?: unknown } };
    const savedIpc = win.electron?.ipc;
    win.electron = { ...(win.electron ?? {}), ipc: undefined };

    try {
      const manager = new AIProviderManager();
      await expect(
        manager.completeViaMain({ messages: [{ role: 'user', content: 'hi' }] })
      ).rejects.toThrow(/Electron IPC not available/);

      const stream = manager.streamViaMain({ messages: [{ role: 'user', content: 'hi' }] });
      await expect(stream.next()).rejects.toThrow(/Electron IPC not available/);
    } finally {
      win.electron = { ...(win.electron ?? {}), ipc: savedIpc };
    }
  });

  it('ignores fromMain messages for unknown request ids', () => {
    expect(() => {
      fromMainHandler!({
        type: 'ai:complete:result',
        requestId: 'req_unknown',
        success: true,
        provider: 'deepseek',
        model: 'm',
        content: 'x',
      });
      fromMainHandler!({
        type: 'ai:stream:chunk',
        requestId: 'req_unknown',
        chunk: 'x',
        provider: 'deepseek',
      });
      fromMainHandler!({
        type: 'ai:stream:done',
        requestId: 'req_unknown',
        success: true,
        provider: 'deepseek',
        model: 'm',
      });
      fromMainHandler!(null);
    }).not.toThrow();
  });
});
