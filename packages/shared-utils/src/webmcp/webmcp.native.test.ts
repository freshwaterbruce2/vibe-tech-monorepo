/**
 * Native-mode tests for WebMCPManager.
 *
 * A fake native document.modelContext is installed BEFORE the singleton is
 * created, simulating Chrome 149+ with the WebMCP origin trial enabled.
 * Kept in a separate file from webmcp.test.ts so it gets its own jsdom and
 * module registry (vitest isolates environments per test file).
 */
import { describe, expect, it, vi } from 'vitest';

import { WebMCPManager } from './index';
import type { RegisterToolOptions, ToolDefinition } from './index';

class FakeNativeModelContext extends EventTarget {
  registered: Array<{ tool: ToolDefinition; options?: RegisterToolOptions }> = [];

  registerTool(tool: ToolDefinition, options?: RegisterToolOptions): void {
    this.registered.push({ tool, options });
  }
}

const fakeNative = new FakeNativeModelContext();
Object.defineProperty(document, 'modelContext', {
  value: fakeNative,
  writable: true,
  configurable: true,
});

const manager = WebMCPManager.getInstance();

function makeTool(name: string): ToolDefinition {
  return {
    name,
    description: `Native test tool ${name}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => ({ ok: true }),
  };
}

describe('WebMCPManager with a native modelContext', () => {
  it('detects native mode and does not overwrite document.modelContext', () => {
    expect(manager.hasNativeModelContext()).toBe(true);
    expect((document as unknown as { modelContext: unknown }).modelContext).toBe(fakeNative);
  });

  it('aliases navigator.modelContext to the native object', () => {
    expect((navigator as unknown as { modelContext: unknown }).modelContext).toBe(fakeNative);
  });

  it('delegates registrations to the native context with options intact', () => {
    const controller = new AbortController();
    const options: RegisterToolOptions = {
      signal: controller.signal,
      exposedTo: ['https://example.com'],
    };
    manager.registerImperativeTool(makeTool('native_delegated'), options);

    const delegated = fakeNative.registered.find(r => r.tool.name === 'native_delegated');
    expect(delegated).toBeDefined();
    expect(delegated?.options?.exposedTo).toEqual(['https://example.com']);
    expect(delegated?.options?.signal).toBe(controller.signal);

    // Local mirror still serves inspection and execution
    expect(manager.listTools().map(t => t.name)).toContain('native_delegated');
    controller.abort();
    expect(manager.listTools().map(t => t.name)).not.toContain('native_delegated');
  });

  it('keeps the local registry working when native registration throws', () => {
    const originalRegisterTool = fakeNative.registerTool.bind(fakeNative);
    fakeNative.registerTool = () => {
      throw new Error('origin trial rejected the registration');
    };

    const controller = new AbortController();
    expect(() => manager.registerImperativeTool(makeTool('native_reject'), { signal: controller.signal })).not.toThrow();
    expect(manager.listTools().map(t => t.name)).toContain('native_reject');

    controller.abort();
    fakeNative.registerTool = originalRegisterTool;
  });

  it('forwards native toolchange events to subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    fakeNative.dispatchEvent(new Event('toolchange'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    fakeNative.dispatchEvent(new Event('toolchange'));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
