import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebMCPGatewayService, type WebMCPRendererTarget } from './webmcp-gateway';
import { WEBMCP_EXECUTE_REQUEST_CHANNEL, type WebMCPExecuteRequest, type WebMCPToolDescriptor } from '../../shared/types';

class FakeRenderer implements WebMCPRendererTarget {
  sent: Array<{ channel: string; args: unknown[] }> = [];
  destroyed = false;
  private destroyedListeners: Array<() => void> = [];

  send(channel: string, ...args: unknown[]): void {
    this.sent.push({ channel, args });
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  once(_event: 'destroyed', listener: () => void): unknown {
    this.destroyedListeners.push(listener);
    return this;
  }

  destroy(): void {
    this.destroyed = true;
    for (const l of this.destroyedListeners) l();
    this.destroyedListeners = [];
  }

  lastRequest(): WebMCPExecuteRequest {
    const last = this.sent[this.sent.length - 1];
    expect(last?.channel).toBe(WEBMCP_EXECUTE_REQUEST_CHANNEL);
    return last!.args[0] as WebMCPExecuteRequest;
  }
}

const TOOLS: WebMCPToolDescriptor[] = [
  { name: 'cc_switch_panel', description: 'switch panel', inputSchema: { type: 'object' }, type: 'imperative' },
  { name: 'cc_get_dashboard_state', description: 'state', inputSchema: { type: 'object' }, type: 'imperative' }
];

describe('WebMCPGatewayService', () => {
  let gateway: WebMCPGatewayService;
  let renderer: FakeRenderer;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new WebMCPGatewayService({ executeTimeoutMs: 100 });
    renderer = new FakeRenderer();
  });

  describe('syncTools', () => {
    it('stores descriptors and reports connected status', () => {
      const status = gateway.syncTools(TOOLS, renderer);
      expect(status.connected).toBe(true);
      expect(status.toolCount).toBe(2);
      expect(status.lastSyncAt).toBeTypeOf('number');
      expect(gateway.listTools().map((t) => t.name)).toEqual(['cc_switch_panel', 'cc_get_dashboard_state']);
    });

    it('replaces the registry on re-sync', () => {
      gateway.syncTools(TOOLS, renderer);
      gateway.syncTools([TOOLS[0]!], renderer);
      expect(gateway.listTools()).toHaveLength(1);
    });

    it('accepts an empty list and reports zero tools', () => {
      gateway.syncTools(TOOLS, renderer);
      const status = gateway.syncTools([], renderer);
      expect(status.toolCount).toBe(0);
    });

    it('rejects malformed descriptors', () => {
      expect(() => gateway.syncTools([{ name: '' } as WebMCPToolDescriptor], renderer)).toThrow('invalid webmcp tool descriptor');
      expect(() => gateway.syncTools(null as unknown as WebMCPToolDescriptor[], renderer)).toThrow('invalid webmcp tool list');
    });

    it('detaches and clears tools when the renderer is destroyed', () => {
      gateway.syncTools(TOOLS, renderer);
      renderer.destroy();
      const status = gateway.getStatus();
      expect(status.connected).toBe(false);
      expect(status.toolCount).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('reports disconnected before any sync', () => {
      const status = gateway.getStatus();
      expect(status).toMatchObject({ connected: false, toolCount: 0, lastSyncAt: null, pendingExecutions: 0 });
    });
  });

  describe('executeTool', () => {
    it('rejects when no renderer is connected', async () => {
      await expect(gateway.executeTool('cc_switch_panel', {})).rejects.toThrow('WebMCP renderer not connected');
    });

    it('rejects for unregistered tool names', async () => {
      gateway.syncTools(TOOLS, renderer);
      await expect(gateway.executeTool('nope', {})).rejects.toThrow('not registered');
    });

    it('sends a correlated request and resolves with the renderer result', async () => {
      gateway.syncTools(TOOLS, renderer);
      const pending = gateway.executeTool('cc_switch_panel', { panel: 'memory' });

      const req = renderer.lastRequest();
      expect(req.name).toBe('cc_switch_panel');
      expect(req.args).toEqual({ panel: 'memory' });
      expect(gateway.getStatus().pendingExecutions).toBe(1);

      gateway.handleExecuteResult({ requestId: req.requestId, ok: true, result: { success: true } });
      await expect(pending).resolves.toEqual({ success: true });
      expect(gateway.getStatus().pendingExecutions).toBe(0);
    });

    it('rejects when the renderer reports a tool error', async () => {
      gateway.syncTools(TOOLS, renderer);
      const pending = gateway.executeTool('cc_switch_panel', {});
      gateway.handleExecuteResult({ requestId: renderer.lastRequest().requestId, ok: false, error: 'unknown panel' });
      await expect(pending).rejects.toThrow('unknown panel');
    });

    it('resolves null when the renderer omits a result', async () => {
      gateway.syncTools(TOOLS, renderer);
      const pending = gateway.executeTool('cc_get_dashboard_state', {});
      gateway.handleExecuteResult({ requestId: renderer.lastRequest().requestId, ok: true });
      await expect(pending).resolves.toBeNull();
    });

    it('times out when the renderer never answers', async () => {
      gateway.syncTools(TOOLS, renderer);
      await expect(gateway.executeTool('cc_switch_panel', {})).rejects.toThrow('timed out after 100ms');
      expect(gateway.getStatus().pendingExecutions).toBe(0);
    });

    it('rejects in-flight executions when the renderer is destroyed', async () => {
      gateway.syncTools(TOOLS, renderer);
      const pending = gateway.executeTool('cc_switch_panel', {});
      renderer.destroy();
      await expect(pending).rejects.toThrow('renderer destroyed');
    });

    it('rejects in-flight executions on dispose', async () => {
      gateway.syncTools(TOOLS, renderer);
      const pending = gateway.executeTool('cc_switch_panel', {});
      gateway.dispose();
      await expect(pending).rejects.toThrow('gateway disposed');
    });
  });

  describe('handleExecuteResult', () => {
    it('ignores unknown or malformed responses', () => {
      gateway.syncTools(TOOLS, renderer);
      expect(() => gateway.handleExecuteResult({ requestId: 'missing', ok: true })).not.toThrow();
      expect(() => gateway.handleExecuteResult(null as unknown as { requestId: string; ok: boolean })).not.toThrow();
    });
  });
});
