import type { ServiceContainer } from '../main/service-container';
import type {
  ClaudeAllowedTool, NxGraph, DbMetric,
  ProbeResult, BackupResult, BackupLogEntry, RagSearchResult
} from '../shared/types';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export function registerTools(c: ServiceContainer): McpTool[] {
  return [
    // ---------- observability ----------
    {
      name: 'dashboard_list_apps',
      description:
        'List all applications in the vibetech monorepo. Returns name, type, root path, and tags. Use this to discover what apps exist before acting on them.',
      inputSchema: {
        type: 'object',
        properties: {
          filter_tag: { type: 'string', description: 'Optional: only return apps with this tag (e.g., "scope:ai")' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const graph: NxGraph = await c.nxGraph.getGraph();
        const apps = Object.values(graph.projects).filter((p) => p.type === 'app');
        const filtered = typeof args['filter_tag'] === 'string'
          ? apps.filter((a) => a.tags.includes(args['filter_tag'] as string))
          : apps;
        return {
          count: filtered.length,
          apps: filtered.map((a) => ({
            name: a.name,
            root: a.root,
            absolute_path: `C:\\dev\\${a.root.replace(/\//g, '\\')}`,
            tags: a.tags,
            dependencies: graph.dependencies[a.name]?.map((d) => d.target) ?? []
          }))
        };
      }
    },

    {
      name: 'dashboard_health_check',
      description:
        'Probe all known dashboard-tracked services (frontend-vite on 5173, backend-express on 5177, openrouter-proxy on 3001, memory-mcp on 3200, dashboard-ui on 5180, dashboard-ipc on 3210) and return reachability and latency for each.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (): Promise<unknown> => {
        const results: ProbeResult[] = await c.health.probeAll();
        return {
          checked_at: Date.now(),
          reachable_count: results.filter((r) => r.reachable).length,
          total_count: results.length,
          services: results
        };
      }
    },

    {
      name: 'dashboard_db_metrics',
      description:
        'Return size, WAL size, table row counts, and journal mode for each SQLite database on D:\\ tracked by the dashboard (nova_activity, nova_shared, trading, learning). Read-only. Flags databases with WAL > 100 MB or total size > 500 MB.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Optional: return metrics for only this database' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const all: DbMetric[] = await c.dbMetrics.collectAll();
        const filtered = typeof args['name'] === 'string'
          ? all.filter((m) => m.name === args['name'])
          : all;
        return filtered.map((m) => ({
          ...m,
          warnings: [
            m.walSizeBytes > 100 * 1024 * 1024 ? 'WAL_LARGE' : null,
            m.sizeBytes > 500 * 1024 * 1024 ? 'SIZE_LARGE' : null,
            m.error ? `ERROR: ${m.error}` : null
          ].filter((w) => w !== null)
        }));
      }
    },

    {
      name: 'dashboard_nx_graph',
      description:
        'Return the full Nx dependency graph for the monorepo: projects with their type, root, tags, and inter-project dependencies. Use this to understand build ordering or to find what depends on a given library.',
      inputSchema: {
        type: 'object',
        properties: {
          app_only: { type: 'boolean', description: 'If true, return only app-type projects (exclude libs)' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const graph: NxGraph = await c.nxGraph.getGraph();
        const projects = args['app_only'] === true
          ? Object.fromEntries(Object.entries(graph.projects).filter(([, p]) => p.type === 'app'))
          : graph.projects;
        return { ...graph, projects };
      }
    },

    {
      name: 'dashboard_stat_path',
      description:
        'Get filesystem metadata (exists, isDirectory, isFile, sizeBytes, mtimeMs) for a given Windows path. Read-only. Use for checking whether a dist/ directory exists, when a file was last modified, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute Windows path, e.g., C:\\dev\\apps\\nova-agent\\dist' }
        },
        required: ['path'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const path = args['path'];
        if (typeof path !== 'string' || !path) throw new Error('path required');
        const { existsSync, statSync } = await import('node:fs');
        if (!existsSync(path)) {
          return { path, exists: false, isDirectory: false, isFile: false, sizeBytes: 0, mtimeMs: null };
        }
        const s = statSync(path);
        return {
          path,
          exists: true,
          isDirectory: s.isDirectory(),
          isFile: s.isFile(),
          sizeBytes: s.size,
          mtimeMs: s.mtimeMs
        };
      }
    },

    {
      name: 'dashboard_recent_backups',
      description:
        'List recent zip backups from C:\\dev\\_backups sorted newest-first. Each entry includes the zip filename, size, and creation time. Use to check whether a recent change was backed up.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max entries to return (default 20, max 100)' }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const limit = Math.min(
          Math.max(typeof args['limit'] === 'number' ? args['limit'] : 20, 1),
          100
        );
        const entries: BackupLogEntry[] = c.backup.listRecent(limit);
        return { count: entries.length, backups: entries };
      }
    },

    // ---------- actions ----------
    {
      name: 'dashboard_create_backup',
      description:
        "Create a zip backup of a directory or file. Uses PowerShell Compress-Archive under the hood (Bruce's standard command). Destination defaults to C:\\dev\\_backups. Filenames are deterministic: <source>_<label>_<yyyymmdd_hhmmss>.zip. USE THIS BEFORE ANY DESTRUCTIVE CHANGE.",
      inputSchema: {
        type: 'object',
        properties: {
          source_path: { type: 'string', description: 'Absolute path to back up (file or directory)' },
          label: { type: 'string', description: 'Optional label appended to filename (sanitized to alnum+dash)' }
        },
        required: ['source_path'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const sourcePath = args['source_path'];
        const label = args['label'];
        if (typeof sourcePath !== 'string' || !sourcePath) throw new Error('source_path required');
        const result: BackupResult = await c.backup.createBackup({
          sourcePath,
          label: typeof label === 'string' ? label : undefined
        });
        return result;
      }
    },

    {
      name: 'dashboard_search_rag',
      description:
        'Semantic search across the C:\\dev monorepo using the local RAG index (mcp-rag-server). Returns file paths, snippets, and similarity scores. Prefer this over reading entire files when looking for a specific concept, pattern, or symbol.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language query, e.g., "claude code bridge spawn logic"' },
          top_k: { type: 'number', description: 'Max hits to return (default 8)' },
          app_filter: { type: 'string', description: 'Optional: restrict results to an app name' }
        },
        required: ['query'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const query = args['query'];
        if (typeof query !== 'string' || !query) throw new Error('query required');
        const topK = typeof args['top_k'] === 'number' ? args['top_k'] : 8;
        const appFilter = typeof args['app_filter'] === 'string' ? args['app_filter'] : undefined;
        const result: RagSearchResult = await c.rag.search({
          query,
          topK,
          filter: appFilter ? { app: appFilter } : undefined
        });
        return result;
      }
    },

    {
      name: 'dashboard_invoke_claude',
      description:
        'Spawn Claude Code headless (claude -p) against a monorepo app and return the result. Stream events are logged to stderr for debugging but not returned. Use for scripted sub-tasks where you want Claude Code to do focused work in one app. PRECAUTION: this spawns a real Claude Code session and incurs cost.',
      inputSchema: {
        type: 'object',
        properties: {
          app_name: { type: 'string', description: 'Nx project name (must be type:app). Determines cwd.' },
          prompt: { type: 'string', description: 'The full prompt passed via -p' },
          allowed_tools: {
            type: 'array',
            items: { type: 'string', enum: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch'] },
            description: 'Tools Claude Code may use. Defaults to Read,Glob,Grep (read-only).'
          },
          permission_mode: {
            type: 'string',
            enum: ['plan', 'acceptEdits', 'bypassPermissions', 'default'],
            description: 'Permission mode. "plan" is read-only (recommended default).'
          },
          timeout_ms: { type: 'number', description: 'Max runtime in ms (default 600000 = 10 min)' }
        },
        required: ['app_name', 'prompt'],
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const appName = args['app_name'];
        const prompt = args['prompt'];
        if (typeof appName !== 'string' || !appName) throw new Error('app_name required');
        if (typeof prompt !== 'string' || !prompt) throw new Error('prompt required');

        const graph = await c.nxGraph.getGraph();
        const app = graph.projects[appName];
        if (app?.type !== 'app') {
          throw new Error(`not an app: ${appName}`);
        }
        const cwd = `C:\\dev\\${app.root.replace(/\//g, '\\')}`;

        const allowedTools = Array.isArray(args['allowed_tools'])
          ? (args['allowed_tools'] as ClaudeAllowedTool[])
          : (['Read', 'Glob', 'Grep'] as ClaudeAllowedTool[]);
        const permissionMode = typeof args['permission_mode'] === 'string'
          ? (args['permission_mode'] as 'plan' | 'acceptEdits' | 'bypassPermissions' | 'default')
          : 'plan';
        const timeoutMs = typeof args['timeout_ms'] === 'number' ? args['timeout_ms'] : 10 * 60 * 1000;

        const result = await c.claude.invoke({
          prompt,
          cwd,
          allowedTools,
          permissionMode,
          timeoutMs
        });
        return result;
      }
    },

    {
      name: 'dashboard_list_processes',
      description:
        'List all processes the dashboard has spawned since it (or this MCP server) started. Includes running and exited processes with command, args, status, exit code, and runtime.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['running', 'exited', 'killed', 'error'],
            description: 'Optional: filter by status'
          }
        },
        additionalProperties: false
      },
      handler: async (args): Promise<unknown> => {
        const all = c.runner.list();
        const status = args['status'];
        const filtered = typeof status === 'string' ? all.filter((p) => p.status === status) : all;
        return { count: filtered.length, processes: filtered };
      }
    },

    // ---------- meta ----------
    {
      name: 'dashboard_overview',
      description:
        "Return a one-shot situational overview of the monorepo: app count, database sizes (with any alerts), reachable services, recent backup count, processes running. Use this as the first call when Bruce asks \"what's the state of things?\"",
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (): Promise<unknown> => {
        const [graph, dbs, probes, backups] = await Promise.all([
          c.nxGraph.getGraph().catch((e: Error) => ({ error: e.message, projects: {}, dependencies: {}, generatedAt: 0 })),
          c.dbMetrics.collectAll().catch((e: Error) => [{ error: e.message }]),
          c.health.probeAll().catch((e: Error) => [{ error: e.message }]),
          Promise.resolve(c.backup.listRecent(5))
        ]);

        const projects = 'projects' in graph ? graph.projects : {};
        const apps = Object.values(projects).filter((p: unknown) => (p as { type?: string }).type === 'app');
        const libs = Object.values(projects).filter((p: unknown) => (p as { type?: string }).type === 'lib');

        const dbArray = Array.isArray(dbs) ? dbs as DbMetric[] : [];
        const dbAlerts = dbArray
          .filter((d) => !('error' in d && d.error))
          .filter((d) => d.walSizeBytes > 100 * 1024 * 1024 || d.sizeBytes > 500 * 1024 * 1024)
          .map((d) => ({ name: d.name, size_mb: (d.sizeBytes / 1024 / 1024).toFixed(1), wal_mb: (d.walSizeBytes / 1024 / 1024).toFixed(1) }));

        const probeArray = Array.isArray(probes) ? probes as ProbeResult[] : [];
        const reachable = probeArray.filter((p) => p.reachable).map((p) => p.service);
        const unreachable = probeArray.filter((p) => !p.reachable).map((p) => p.service);

        return {
          timestamp: Date.now(),
          monorepo: {
            apps_count: apps.length,
            libs_count: libs.length,
            root: 'C:\\dev'
          },
          databases: {
            tracked: dbArray.length,
            alerts: dbAlerts,
            missing: dbArray.filter((d) => 'error' in d && d.error === 'file not found').map((d) => d.name)
          },
          services: {
            reachable,
            unreachable
          },
          backups: {
            recent: backups.length,
            most_recent: backups[0]
              ? { file: backups[0].zipPath.split('\\').pop(), at: new Date(backups[0].createdAt).toISOString() }
              : null
          },
          processes: {
            running: c.runner.list().filter((p) => p.status === 'running').length,
            total: c.runner.list().length
          }
        };
      }
    }
  ];
}
