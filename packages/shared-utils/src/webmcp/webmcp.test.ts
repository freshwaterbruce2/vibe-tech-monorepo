/**
 * Tests for the WebMCP integration library (WebMCPManager).
 * Runs under jsdom (see vitest.config.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getStandardMcpToolsBridge, WebMCPManager } from './index';
import type { ToolDefinition, WebMCPSubmitEvent } from './index';

// WebMCPManager is a singleton, so tests share one instance. Each test uses
// unique tool names and cleans up registered tools via AbortController.
const manager = WebMCPManager.getInstance();

function makeTool(name: string, execute?: ToolDefinition['execute']): ToolDefinition {
  return {
    name,
    description: `Test tool ${name}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: execute ?? (async () => ({ ok: true })),
  };
}

describe('WebMCPManager polyfill', () => {
  it('installs document.modelContext and navigator.modelContext', () => {
    expect(document).toHaveProperty('modelContext');
    expect(navigator).toHaveProperty('modelContext');
  });

  it('reports polyfill mode under jsdom (no native implementation)', () => {
    expect(manager.hasNativeModelContext()).toBe(false);
  });

  it('routes document.modelContext.registerTool into the manager registry', async () => {
    const controller = new AbortController();
    const ctx = (document as unknown as { modelContext: { registerTool: typeof manager.registerImperativeTool } }).modelContext;
    ctx.registerTool(makeTool('polyfill_routed_tool'), { signal: controller.signal });

    expect(manager.listTools().map(t => t.name)).toContain('polyfill_routed_tool');
    controller.abort();
    expect(manager.listTools().map(t => t.name)).not.toContain('polyfill_routed_tool');
  });

  it('dispatches toolchange events on the polyfilled modelContext', () => {
    const ctx = (document as unknown as { modelContext: EventTarget }).modelContext;
    const listener = vi.fn();
    ctx.addEventListener('toolchange', listener);

    const controller = new AbortController();
    manager.registerImperativeTool(makeTool('evt_tool'), { signal: controller.signal });
    expect(listener).toHaveBeenCalledTimes(1);

    controller.abort();
    expect(listener).toHaveBeenCalledTimes(2);
    ctx.removeEventListener('toolchange', listener);
  });
});

describe('imperative tool registry', () => {
  it('registers, lists, and executes a tool', async () => {
    const controller = new AbortController();
    manager.registerImperativeTool(
      makeTool('imp_exec_tool', async (args) => ({ echoed: args['value'] })),
      { signal: controller.signal }
    );

    const listed = manager.listTools().find(t => t.name === 'imp_exec_tool');
    expect(listed?.type).toBe('imperative');
    expect(listed?.description).toBe('Test tool imp_exec_tool');

    await expect(manager.executeTool('imp_exec_tool', { value: 42 })).resolves.toEqual({ echoed: 42 });
    controller.abort();
  });

  it('throws for unknown tools', async () => {
    await expect(manager.executeTool('does_not_exist', {})).rejects.toThrow('not found');
  });

  it('ignores registration with an already-aborted signal', () => {
    const controller = new AbortController();
    controller.abort();
    manager.registerImperativeTool(makeTool('imp_dead_tool'), { signal: controller.signal });
    expect(manager.listTools().map(t => t.name)).not.toContain('imp_dead_tool');
  });

  it('unregisters when the abort signal fires', () => {
    const controller = new AbortController();
    manager.registerImperativeTool(makeTool('imp_abort_tool'), { signal: controller.signal });
    expect(manager.listTools().map(t => t.name)).toContain('imp_abort_tool');

    controller.abort();
    expect(manager.listTools().map(t => t.name)).not.toContain('imp_abort_tool');
  });
});

describe('subscribe', () => {
  it('notifies on register and on abort-unregister, and supports unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    const controller = new AbortController();
    manager.registerImperativeTool(makeTool('sub_tool'), { signal: controller.signal });
    expect(listener).toHaveBeenCalledTimes(1);

    controller.abort();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    const controller2 = new AbortController();
    manager.registerImperativeTool(makeTool('sub_tool_2'), { signal: controller2.signal });
    expect(listener).toHaveBeenCalledTimes(2);
    controller2.abort();
  });
});

describe('declarative form tools', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mountForm(html: string): HTMLFormElement {
    document.body.insertAdjacentHTML('beforeend', html);
    const form = document.body.querySelector<HTMLFormElement>('form:last-of-type');
    if (!form) throw new Error('test form failed to mount');
    return form;
  }

  it('generates a JSON schema from form fields', () => {
    mountForm(`
      <form toolname="dec_search" tooldescription="Search the catalog">
        <input name="query" required placeholder="Search term" />
        <input name="limit" type="number" min="1" max="50" />
        <input name="inStock" type="checkbox" toolparamdescription="Only in-stock items" />
        <select name="category">
          <option value="books">Books</option>
          <option value="games">Games</option>
        </select>
        <button type="submit">Go</button>
      </form>
    `);

    const tool = manager.listTools().find(t => t.name === 'dec_search');
    expect(tool?.type).toBe('declarative');
    expect(tool?.description).toBe('Search the catalog');

    const schema = tool?.inputSchema as {
      properties: Record<string, { type: string; description: string; enum?: string[]; minimum?: number; maximum?: number }>;
      required?: string[];
    };
    expect(schema.properties['query']).toMatchObject({ type: 'string', description: 'Search term' });
    expect(schema.properties['limit']).toMatchObject({ type: 'number', minimum: 1, maximum: 50 });
    expect(schema.properties['inStock']).toMatchObject({ type: 'boolean', description: 'Only in-stock items' });
    expect(schema.properties['category']?.enum).toEqual(['books', 'games']);
    expect(schema.required).toEqual(['query']);
  });

  it('executes a declarative form via respondWith and marks agentInvoked', async () => {
    const form = mountForm(`
      <form toolname="dec_submit" tooldescription="Submit a value">
        <input name="value" />
        <button type="submit">Go</button>
      </form>
    `);

    let seenAgentInvoked = false;
    form.addEventListener('submit', (event) => {
      const submitEvent = event as unknown as WebMCPSubmitEvent;
      seenAgentInvoked = submitEvent.agentInvoked;
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('input[name="value"]');
      submitEvent.respondWith(Promise.resolve({ received: input?.value }));
    });

    const result = await manager.executeTool('dec_submit', { value: 'hello' });
    expect(seenAgentInvoked).toBe(true);
    expect(result).toEqual({ received: 'hello' });
  });

  it('reports submission state when no respondWith handler exists', async () => {
    const form = mountForm(`
      <form toolname="dec_plain" tooldescription="Plain form">
        <input name="value" />
      </form>
    `);
    form.addEventListener('submit', (event) => event.preventDefault());

    const result = await manager.executeTool('dec_plain', { value: 'x' });
    expect(result).toEqual({ success: true, submitted: false });
  });
});

describe('getStandardMcpToolsBridge', () => {
  it('maps registered tools to MCP tool descriptors', () => {
    const controller = new AbortController();
    manager.registerImperativeTool(makeTool('bridge_tool'), { signal: controller.signal });

    const bridged = getStandardMcpToolsBridge().find(t => t.name === 'bridge_tool');
    expect(bridged).toMatchObject({
      name: 'bridge_tool',
      description: 'Test tool bridge_tool',
    });
    expect(bridged?.inputSchema).toEqual({ type: 'object', properties: {}, additionalProperties: false });
    controller.abort();
  });

  it('executes bridged tools and wraps results in CallToolResult shape', async () => {
    const controller = new AbortController();
    manager.registerImperativeTool(
      makeTool('bridge_exec', async (args) => ({ doubled: (args['n'] as number) * 2 })),
      { signal: controller.signal }
    );

    const bridged = getStandardMcpToolsBridge().find(t => t.name === 'bridge_exec');
    const result = await bridged?.handler({ n: 21 });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ doubled: 42 }) }],
    });
    controller.abort();
  });

  it('passes string results through without JSON encoding', async () => {
    const controller = new AbortController();
    manager.registerImperativeTool(
      makeTool('bridge_string', async () => 'plain text'),
      { signal: controller.signal }
    );

    const bridged = getStandardMcpToolsBridge().find(t => t.name === 'bridge_string');
    const result = await bridged?.handler({});
    expect(result?.content[0]?.text).toBe('plain text');
    controller.abort();
  });

  it('returns isError results when a bridged tool throws', async () => {
    const controller = new AbortController();
    manager.registerImperativeTool(
      makeTool('bridge_fail', async () => {
        throw new Error('boom');
      }),
      { signal: controller.signal }
    );

    const bridged = getStandardMcpToolsBridge().find(t => t.name === 'bridge_fail');
    const result = await bridged?.handler({});
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toBe('boom');
    controller.abort();
  });
});
