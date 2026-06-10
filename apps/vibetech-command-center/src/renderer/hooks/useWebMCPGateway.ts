import { useEffect } from 'react';
import { WebMCPManager } from '@vibetech/shared-utils';
import { useUiStore, PANEL_IDS, type PanelId } from '@renderer/stores';
import { unwrap } from '@renderer/lib/ipc';
import type { WebMCPToolDescriptor } from '@shared/types';

const PUBLISH_DEBOUNCE_MS = 100;

function isPanelId(value: unknown): value is PanelId {
  return typeof value === 'string' && (PANEL_IDS as readonly string[]).includes(value);
}

function registerCommandCenterTools(manager: WebMCPManager, signal: AbortSignal): void {
  manager.registerImperativeTool({
    name: 'cc_get_dashboard_state',
    description: 'Returns the Command Center dashboard state: active panel, sidebar state, stream connection, and recent file event count.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      const s = useUiStore.getState();
      return {
        activePanel: s.activePanel,
        sidebarCollapsed: s.sidebarCollapsed,
        wsConnected: s.wsConnected,
        recentFileEventCount: s.recentFileEvents.length
      };
    }
  }, { signal });

  manager.registerImperativeTool({
    name: 'cc_list_panels',
    description: 'Lists all dashboard panel ids that can be activated with cc_switch_panel.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => ({ panels: [...PANEL_IDS] })
  }, { signal });

  manager.registerImperativeTool({
    name: 'cc_switch_panel',
    description: 'Switches the Command Center dashboard to the given panel. The change is immediately visible in the UI.',
    inputSchema: {
      type: 'object',
      properties: {
        panel: {
          type: 'string',
          description: 'The panel to activate.',
          enum: [...PANEL_IDS]
        }
      },
      required: ['panel'],
      additionalProperties: false
    },
    execute: async (args: { panel: string }) => {
      if (!isPanelId(args.panel)) {
        throw new Error(`unknown panel "${args.panel}" - valid panels: ${PANEL_IDS.join(', ')}`);
      }
      useUiStore.getState().setActivePanel(args.panel);
      return { success: true, activePanel: args.panel };
    }
  }, { signal });

  manager.registerImperativeTool({
    name: 'cc_run_nx_task',
    description: 'Launches an Nx task (build, test, lint, typecheck) for a monorepo project via the orchestrator. The task appears in the Agent Orchestrator task list.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Nx project name.' },
        target: { type: 'string', description: 'Nx target, e.g. build or test.' },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Extra CLI arguments.'
        }
      },
      required: ['project', 'target'],
      additionalProperties: false
    },
    execute: async (args: { project: string; target: string; args?: string[] }) => {
      const handle = await unwrap(window.commandCenter.agent.taskRun({
        project: args.project,
        target: args.target,
        args: args.args
      }));
      return { success: true, processId: handle.id, status: handle.status };
    }
  }, { signal });
}

/**
 * Renderer half of the WebMCP-over-IPC gateway.
 *
 * Registers the Command Center's WebMCP tools on document.modelContext,
 * publishes the tool registry to the main process whenever it changes,
 * and services execute requests arriving from the main-process gateway.
 */
export function useWebMCPGateway(): void {
  useEffect(() => {
    // A hot-reloaded renderer can outrun a stale preload that predates the
    // webmcp bridge; degrade to a console error instead of crashing React.
    const bridge = window.commandCenter?.webmcp;
    if (!bridge) {
      console.error('[WebMCP] commandCenter.webmcp bridge unavailable - restart the app to rebuild the preload script');
      return;
    }

    const manager = WebMCPManager.getInstance();
    const controller = new AbortController();
    let publishTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const publish = (): void => {
      if (publishTimer !== null) clearTimeout(publishTimer);
      publishTimer = setTimeout(() => {
        publishTimer = null;
        if (disposed) return;
        const tools: WebMCPToolDescriptor[] = manager.listTools();
        bridge.publishTools(tools).catch(() => {
          // Main process unavailable (e.g. during shutdown) - the next
          // registry change or remount re-publishes.
        });
      }, PUBLISH_DEBOUNCE_MS);
    };

    const unsubscribeManager = manager.subscribe(publish);
    const unsubscribeExecute = bridge.onExecuteRequest((req) => {
      void manager.executeTool(req.name, req.args)
        .then((result) => {
          bridge.respond({ requestId: req.requestId, ok: true, result });
        })
        .catch((e: unknown) => {
          bridge.respond({
            requestId: req.requestId,
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          });
        });
    });

    registerCommandCenterTools(manager, controller.signal);
    manager.startScanning();
    publish();

    return () => {
      disposed = true;
      if (publishTimer !== null) clearTimeout(publishTimer);
      unsubscribeManager();
      unsubscribeExecute();
      controller.abort();
      manager.stopScanning();
      // Leave the main-process registry consistent with reality.
      bridge.publishTools([]).catch(() => {});
    };
  }, []);
}
